<?php
/**
 * Local WP-CLI updater integration tests with mocked HTTP and no installation.
 *
 * @package Adminlume
 */

use Adminlume\Updater;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || 'local' !== wp_get_environment_type() ||
	! in_array( wp_parse_url( home_url(), PHP_URL_HOST ), array( 'localhost', '127.0.0.1' ), true ) ) {
	throw new RuntimeException( 'Local WP-CLI only.' );
}

require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
require_once ABSPATH . 'wp-admin/includes/file.php';

$basename = 'adminlume/adminlume.php';
$updater = new Updater( WP_PLUGIN_DIR . '/' . $basename );
$headers = get_plugin_data( WP_PLUGIN_DIR . '/' . $basename, false, false );
$download_body = 'Local fixture package bytes; never installed.';
$expected_body = $download_body;
$payload = array(
	'schema' => 1,
	'version' => '99.0.0',
	'requires' => '6.5',
	'requires_php' => '8.1',
	'url' => Updater::REPOSITORY . '/releases/tag/v99.0.0',
	'package' => Updater::REPOSITORY . '/releases/download/v99.0.0/adminlume-99.0.0.zip',
	'sha256' => hash( 'sha256', $expected_body ),
	'changelog' => '<script>alert("untrusted")</script> New release.',
);
$valid_payload = $payload;
$status = 200;
$offline = false;
$calls = 0;
$files = array();
$checks = 0;
$previous = array();
foreach ( array( Updater::CACHE_KEY, 'update_plugins' ) as $key ) {
	$previous[ $key ] = array( get_site_transient( $key ), get_site_option( '_site_transient_timeout_' . $key ) );
}
$auto_updates = get_site_option( 'auto_update_plugins' );
$check = static function ( bool $condition, string $message ) use ( &$checks ): void {
	if ( ! $condition ) {
		throw new RuntimeException( 'FAIL: ' . $message );
	}
	++$checks;
};
$response = static fn( $body, $code = 200 ) => array( 'response' => array( 'code' => $code, 'message' => 'Fixture' ), 'headers' => array(), 'body' => $body, 'cookies' => array() );
$http = static function ( $preempt, $args, $url ) use ( &$payload, &$calls, &$status, &$offline, &$download_body, &$files, $response, $check ) {
	if ( Updater::MANIFEST === $url ) {
		++$calls;
		$check( ! str_contains( $args['user-agent'], home_url() ), 'manifest requests do not send the site URL in the user agent' );
		$check( 65536 === $args['limit_response_size'] && 10 === $args['timeout'], 'manifest requests have response-size and timeout bounds' );
		return $offline ? new WP_Error( 'fixture_offline', 'Offline fixture.' ) : $response( is_string( $payload ) ? $payload : wp_json_encode( $payload ), $status );
	}
	if ( str_starts_with( $url, Updater::REPOSITORY . '/releases/download/' ) ) {
		$files[] = $args['filename'];
		file_put_contents( $args['filename'], $download_body );
		return $response( '' );
	}
	if ( str_contains( $url, 'api.wordpress.org/plugins/update-check/' ) ) {
		return $response( wp_json_encode( array( 'plugins' => new stdClass(), 'no_update' => new stdClass(), 'translations' => array() ) ) );
	}
	return new WP_Error( 'unexpected_http', 'No external HTTP is permitted in updater tests.' );
};
add_filter( 'pre_http_request', $http, 10, 3 );

try {
	delete_site_transient( Updater::CACHE_KEY );
	$check( Updater::REPOSITORY === $headers['UpdateURI'], 'the custom Update URI prevents WordPress.org slug collisions' );
	$check( false === $updater->update( false, $headers, 'another/plugin.php', array() ) && 0 === $calls, 'unrelated plugin checks make no requests' );
	$check( false === $updater->update( false, array(), $basename, array() ), 'a mismatched Update URI is ignored' );
	$update = apply_filters( 'update_plugins_github.com', false, $headers, $basename, array( 'it_IT' ) );
	$check( '99.0.0' === $update['version'] && $payload['package'] === $update['package'], 'native hostname hook returns the stable package' );
	$check( ! isset( $update['autoupdate'] ), 'the updater never forces automatic installation' );
	$check( str_ends_with( $update['icons']['svg'], '/plugins/adminlume/assets/images/icon.svg' ) &&
		str_ends_with( $update['icons']['1x'], '/plugins/adminlume/assets/images/icon-128x128.png' ) &&
		str_ends_with( $update['icons']['2x'], '/plugins/adminlume/assets/images/icon-256x256.png' ), 'update metadata uses bundled SVG and PNG plugin icons' );
	$updater->update( false, $headers, $basename, array() );
	$check( 1 === $calls, 'valid metadata is cached across checks' );

	delete_site_transient( 'update_plugins' );
	wp_update_plugins();
	$native = get_site_transient( 'update_plugins' );
	$check( isset( $native->response[ $basename ] ) && '99.0.0' === $native->response[ $basename ]->new_version, 'WordPress itself detects a newer GitHub release' );
	$check( '6.5' === $native->response[ $basename ]->requires && '8.1' === $native->response[ $basename ]->requires_php, 'native update metadata contains both compatibility requirements' );
	$check( $auto_updates === get_site_option( 'auto_update_plugins' ), 'native automatic-update preferences are unchanged' );

	$info = plugins_api( 'plugin_information', (object) array( 'slug' => 'adminlume' ) );
	$check( ! is_wp_error( $info ) && $payload['package'] === $info->download_link, 'native plugin details use the installable release asset' );
	$check( $info->icons === $update['icons'], 'plugin information provides the same local icon variants' );
	$check( ! str_contains( $info->sections['changelog'], '<script>' ) && str_contains( $info->sections['changelog'], '&lt;script&gt;' ), 'release notes are rendered as escaped text' );
	$sentinel = (object) array( 'unrelated' => true );
	$check( $sentinel === $updater->information( $sentinel, 'plugin_information', (object) array( 'slug' => 'other' ) ), 'other plugin detail requests are preserved' );
	$check( $sentinel === $updater->information( $sentinel, 'query_plugins', (object) array( 'slug' => 'adminlume' ) ), 'directory search requests are preserved' );

	$file = $updater->download( false, $payload['package'], new stdClass(), array( 'plugin' => $basename ) );
	$check( is_string( $file ) && is_file( $file ) && hash_file( 'sha256', $file ) === $payload['sha256'], 'a matching checksum allows the native package download' );
	$download_body = 'Corrupted fixture bytes.';
	$error = $updater->download( false, $payload['package'], new stdClass(), array( 'plugin' => $basename ) );
	$check( is_wp_error( $error ) && 'adminlume_checksum_mismatch' === $error->get_error_code(), 'a mismatched package checksum blocks the update' );
	$check( ! is_file( end( $files ) ), 'a rejected package temporary file is removed' );
	$check( false === $updater->download( false, 'https://example.com/other.zip', new stdClass(), array() ), 'unrelated package downloads are untouched' );
	$check( 'prior-result' === $updater->download( 'prior-result', $payload['package'], new stdClass(), array() ), 'existing downloader results are not overwritten' );
	$check( false === $updater->download( false, $payload['package'], new stdClass(), array( 'plugin' => 'other/other.php' ) ), 'other plugin upgrade contexts are untouched' );
	$error = $updater->download( false, Updater::REPOSITORY . '/releases/download/v1.0.0/adminlume-1.0.0.zip', new stdClass(), array( 'plugin' => $basename ) );
	$check( is_wp_error( $error ), 'stale or unknown release packages fail closed' );
	foreach ( array( 'requires', 'requires_php' ) as $requirement ) {
		delete_site_transient( Updater::CACHE_KEY );
		$payload = $valid_payload;
		$payload[ $requirement ] = '99.0';
		$error = $updater->download( false, $payload['package'], new stdClass(), array( 'plugin' => $basename ) );
		$check( is_wp_error( $error ) && 'adminlume_incompatible_release' === $error->get_error_code(), 'incompatible package blocked before download: ' . $requirement );
	}
	foreach ( array( $headers['Version'], '0.1.0' ) as $version ) {
		delete_site_transient( Updater::CACHE_KEY );
		delete_site_transient( 'update_plugins' );
		$payload = $valid_payload;
		$payload['version'] = $version;
		$payload['url'] = Updater::REPOSITORY . '/releases/tag/v' . $version;
		$payload['package'] = Updater::REPOSITORY . '/releases/download/v' . $version . '/adminlume-' . $version . '.zip';
		wp_update_plugins();
		$native = get_site_transient( 'update_plugins' );
		$check( empty( $native->response[ $basename ] ) && isset( $native->no_update[ $basename ] ), 'core does not offer an equal or older release: ' . $version );
	}

	foreach ( array(
		array( 'version', '1.0.0-rc.1' ),
		array( 'package', 'https://example.com/untrusted.zip' ),
		array( 'package', str_replace( 'https:', 'http:', $valid_payload['package'] ) ),
		array( 'url', 'https://example.com/untrusted' ),
		array( 'sha256', 'invalid' ),
		array( 'requires_php', array( 'bad' ) ),
		array( 'schema', 2 ),
	) as list( $key, $value ) ) {
		delete_site_transient( Updater::CACHE_KEY );
		$payload = $valid_payload;
		$payload[ $key ] = $value;
		$check( false === $updater->update( false, $headers, $basename, array() ), 'invalid manifest field rejected: ' . $key );
	}
	foreach ( array( 'not JSON', array( 'schema' => 1 ) ) as $bad_payload ) {
		delete_site_transient( Updater::CACHE_KEY );
		$payload = $bad_payload;
		$check( false === $updater->update( false, $headers, $basename, array() ), 'malformed or incomplete metadata does not advertise an update' );
	}
	$payload = $valid_payload;
	foreach ( array( 404, 429, 500 ) as $http_status ) {
		delete_site_transient( Updater::CACHE_KEY );
		$status = $http_status;
		$check( false === $updater->update( false, $headers, $basename, array() ), 'HTTP failure is handled safely: ' . $status );
	}
	$status = 200;
	$offline = true;
	delete_site_transient( Updater::CACHE_KEY );
	$before = $calls;
	$check( false === $updater->update( false, $headers, $basename, array() ), 'network errors are non-fatal' );
	$updater->update( false, $headers, $basename, array() );
	$check( $before + 1 === $calls, 'failed checks are negative-cached' );
	$check( is_wp_error( $updater->information( false, 'plugin_information', (object) array( 'slug' => 'adminlume' ) ) ), 'offline plugin details do not fall back to WordPress.org' );
	WP_CLI::success( $checks . ' Adminlume updater integration checks passed.' );
} finally {
	remove_filter( 'pre_http_request', $http, 10 );
	foreach ( $files as $file ) {
		if ( is_file( $file ) ) wp_delete_file( $file );
	}
	foreach ( $previous as $key => list( $value, $expiry ) ) {
		delete_site_transient( $key );
		if ( false !== $value && ( ! $expiry || $expiry > time() ) ) {
			set_site_transient( $key, $value, $expiry ? max( 1, $expiry - time() ) : 0 );
		}
	}
}
