<?php
/**
 * Local WP-CLI localization checks using real WordPress locale switching.
 *
 * Requires the Italian core language pack in the isolated test installation.
 *
 * @package Adminlume
 */

use Adminlume\Assets;
use Adminlume\Chrome;
use Adminlume\FrontendToolbar;
use Adminlume\Settings;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || 'local' !== wp_get_environment_type() ||
	! in_array( wp_parse_url( home_url(), PHP_URL_HOST ), array( 'localhost', '127.0.0.1' ), true ) ) {
	throw new RuntimeException( 'Local WP-CLI only.' );
}
if ( ! in_array( 'it_IT', get_available_languages(), true ) ) {
	throw new RuntimeException( 'Install the Italian WordPress language pack in the local test environment first.' );
}

require_once ABSPATH . 'wp-admin/includes/screen.php';
require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';

$previous_user = get_current_user_id();
$previous_screen = $GLOBALS['current_screen'] ?? null;
$previous_bar = $GLOBALS['show_admin_bar'] ?? null;
$switches = 0;
$checks = 0;
$user_id = wp_insert_user( array( 'user_login' => 'adminlume-i18n-' . wp_generate_uuid4(), 'user_pass' => wp_generate_password( 40 ), 'role' => 'subscriber', 'locale' => 'en_US' ) );
if ( is_wp_error( $user_id ) ) {
	throw new RuntimeException( 'Cannot create isolated test user.' );
}
$show_bar = static fn() => true;
$check = static function ( bool $condition, string $message ) use ( &$checks ): void {
	if ( ! $condition ) throw new RuntimeException( 'FAIL: ' . $message );
	++$checks;
};
$script_labels = static function ( string $handle, string $object ): array {
	$data = (string) wp_scripts()->get_data( $handle, 'data' );
	preg_match_all( '/var ' . preg_quote( $object, '/' ) . '\s*=\s*(\{.*?\});/s', $data, $matches );
	if ( empty( $matches[1] ) ) throw new RuntimeException( 'Missing localized script data: ' . $handle );
	return json_decode( end( $matches[1] ), true, 512, JSON_THROW_ON_ERROR );
};

try {
	wp_set_current_user( $user_id );
	update_user_meta( $user_id, Settings::META_KEY, array( 'enabled' => true ) );
	$check( 'en_US' === get_user_locale( $user_id ), 'the test account has an explicit English preference' );
	if ( switch_to_user_locale( $user_id ) ) ++$switches;
	$check( 'en_US' === determine_locale() && 'Save preferences' === __( 'Save preferences', 'adminlume' ), 'user locale selects English source strings' );
	add_filter( 'show_admin_bar', $show_bar, PHP_INT_MAX );
	$GLOBALS['show_admin_bar'] = true;
	$plugin_file = WP_PLUGIN_DIR . '/adminlume/adminlume.php';
	foreach ( array(
		'en_US' => array( 'Enable Adminlume for me', 'Search menu', 'Hide admin toolbar', 'Hide', 'Dashboard', 'Visit site: ', 'Medium' ),
		'it_IT' => array( 'Abilita Adminlume per me', 'Cerca nel menu', 'Nascondi barra amministrativa', 'Nascondi', 'Bacheca', 'Visita il sito: ', 'Medio' ),
	) as $locale => $expected ) {
		$switched = switch_to_locale( $locale );
		if ( $switched ) ++$switches;
		$check( $locale === determine_locale(), 'WordPress switches to ' . $locale );
		set_current_screen( 'dashboard' );
		ob_start();
		( new Settings() )->render();
		$html = ob_get_clean();
		$check( str_contains( $html, $expected[0] ) && str_contains( $html, $expected[6] ), 'settings and contextual radius labels render in ' . $locale );
		$check( $expected[6] === _x( 'Medium', 'panel corner radius', 'adminlume' ), 'gettext context is preserved in ' . $locale );
		$check( 'Medium' === __( 'Medium', 'adminlume' ), 'context-specific translation does not affect unrelated strings' );
		( new Assets( $plugin_file ) )->enqueue();
		$sidebar = $script_labels( 'rounded-admin-sidebar', 'roundedAdminSidebar' );
		$check( $expected[1] === $sidebar['search'], 'sidebar JavaScript receives translated PHP strings in ' . $locale );
		ob_start();
		( new Chrome() )->site_link();
		$site = ob_get_clean();
		$check( str_contains( $site, esc_attr( $expected[5] . get_bloginfo( 'name' ) ) ), 'site tooltip translates its placeholder safely in ' . $locale );
		$GLOBALS['current_screen'] = null;
		$frontend = new FrontendToolbar( $plugin_file );
		$frontend->enqueue();
		$dock = $script_labels( 'rounded-admin-frontend-toolbar', 'roundedAdminDock' );
		$check( $expected[2] === $dock['hide'] && $expected[3] === $dock['hideLabel'], 'dock JavaScript and accessible labels are translated in ' . $locale );
		$check( 'rounded-admin-dock-' . get_current_blog_id() . '-' . $user_id === $dock['storageKey'], 'localization does not change saved visibility keys' );
		$bar = new WP_Admin_Bar();
		$frontend->nodes( $bar );
		$check( str_contains( $bar->get_node( 'nzm-toolbar-dashboard' )->title, $expected[4] ), 'Dashboard label is translated in ' . $locale );
		if ( $switched ) {
			restore_previous_locale();
			--$switches;
		}
	}
	$check( 'en_US' === determine_locale() && 'Hide' === __( 'Hide', 'adminlume' ), 'returning from Italian restores English without leaking translations' );
	WP_CLI::success( $checks . ' Adminlume localization integration checks passed.' );
} finally {
	while ( $switches > 0 ) {
		restore_previous_locale();
		--$switches;
	}
	remove_filter( 'show_admin_bar', $show_bar, PHP_INT_MAX );
	wp_set_current_user( $previous_user );
	$GLOBALS['current_screen'] = $previous_screen;
	$GLOBALS['show_admin_bar'] = $previous_bar;
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $user_id );
}
