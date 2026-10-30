<?php
/**
 * Native WordPress updates from stable, public GitHub release assets.
 *
 * @package Adminlume
 */

declare(strict_types=1);

namespace Adminlume;

final class Updater {

	public const REPOSITORY = 'https://github.com/adilorenzo10/adminlume';
	public const MANIFEST = self::REPOSITORY . '/releases/latest/download/adminlume-update.json';
	public const CACHE_KEY = 'adminlume_release_manifest_v1';
	private string $basename;

	public function __construct( string $plugin_file ) {
		$this->basename = plugin_basename( $plugin_file );
	}

	/** Register only native update, details, and package download integration. */
	public function register(): void {
		add_filter( 'update_plugins_github.com', array( $this, 'update' ), 10, 4 );
		add_filter( 'plugins_api', array( $this, 'information' ), 10, 3 );
		add_filter( 'upgrader_pre_download', array( $this, 'download' ), 10, 4 );
	}

	/**
	 * Supply metadata for this plugin only; core compares installed versions.
	 *
	 * @param array|false $update      Existing update response.
	 * @param array       $plugin_data Installed plugin headers.
	 * @param string      $plugin_file Plugin basename.
	 * @param string[]    $locales     Installed locales (not sent remotely).
	 * @return array|false
	 */
	public function update( $update, array $plugin_data, string $plugin_file, array $locales ) {
		if ( $plugin_file !== $this->basename || ( $plugin_data['UpdateURI'] ?? '' ) !== self::REPOSITORY ) {
			return $update;
		}
		$release = $this->release();
		if ( ! $release ) {
			return $update;
		}
		return array(
			'id'           => self::REPOSITORY,
			'slug'         => 'adminlume',
			'version'      => $release['version'],
			'url'          => $release['url'],
			'package'      => $release['package'],
			'requires'     => $release['requires'],
			'requires_php' => $release['requires_php'],
		);
	}

	/**
	 * Provide the native plugin-details dialog, never an unrelated directory entry.
	 *
	 * @param mixed  $result Existing API result.
	 * @param string $action Requested API action.
	 * @param object $args   API arguments.
	 * @return mixed
	 */
	public function information( $result, string $action, object $args ) {
		if ( 'plugin_information' !== $action || 'adminlume' !== ( $args->slug ?? '' ) ) {
			return $result;
		}
		$release = $this->release();
		if ( ! $release ) {
			return new \WP_Error( 'adminlume_release_unavailable', __( 'Adminlume release information is temporarily unavailable. Please try again later.', 'adminlume' ) );
		}
		return (object) array(
			'name'          => 'Adminlume',
			'slug'          => 'adminlume',
			'version'       => $release['version'],
			'author'        => 'Dilorsoft',
			'homepage'      => self::REPOSITORY,
			'requires'      => $release['requires'],
			'requires_php'  => $release['requires_php'],
			'download_link' => $release['package'],
			'external'      => true,
			'sections'      => array(
				'description' => esc_html__( 'A lightweight WordPress admin interface and front-end dock with personal preferences. Updates are supplied by the official Adminlume GitHub repository.', 'adminlume' ),
				'changelog'   => nl2br( esc_html( $release['changelog'] ) ),
			),
		);
	}

	/**
	 * Download our package through WordPress and verify its published checksum.
	 *
	 * @param mixed  $reply      Existing pre-download result.
	 * @param string $package    Package URL.
	 * @param object $upgrader   Native upgrader instance.
	 * @param array  $hook_extra Upgrade context.
	 * @return mixed Temporary file, WP_Error, or the unchanged previous result.
	 */
	public function download( $reply, string $package, $upgrader, array $hook_extra ) {
		if ( false !== $reply || ! str_starts_with( $package, self::REPOSITORY . '/releases/download/' ) ||
			( isset( $hook_extra['plugin'] ) && $hook_extra['plugin'] !== $this->basename ) ) {
			return $reply;
		}
		$release = $this->release();
		if ( ! $release || $package !== $release['package'] ) {
			return new \WP_Error( 'adminlume_package_unverified', __( 'The Adminlume update could not be verified. Check for updates again before retrying.', 'adminlume' ) );
		}
		if ( ! is_wp_version_compatible( $release['requires'] ) || ! is_php_version_compatible( $release['requires_php'] ) ) {
			return new \WP_Error( 'adminlume_incompatible_release', __( 'This Adminlume release requires a newer version of WordPress or PHP. The update was not installed.', 'adminlume' ) );
		}
		$file = download_url( $package );
		if ( is_wp_error( $file ) ) {
			return $file;
		}
		if ( ! hash_equals( $release['sha256'], (string) hash_file( 'sha256', $file ) ) ) {
			wp_delete_file( $file );
			return new \WP_Error( 'adminlume_checksum_mismatch', __( 'The Adminlume update checksum does not match. The update was not installed.', 'adminlume' ) );
		}
		return $file;
	}

	/**
	 * Read a bounded, validated manifest with success and failure caching.
	 *
	 * No user data, site URL, installed versions, or locales are sent to GitHub.
	 *
	 * @return array|null Validated metadata, or null when unavailable.
	 */
	private function release(): ?array {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_array( $cached ) ) {
			return $this->validate( $cached );
		}
		if ( 'unavailable' === $cached ) {
			return null;
		}
		// Negative-cache first: concurrent checks and transient errors stay bounded.
		set_site_transient( self::CACHE_KEY, 'unavailable', 15 * MINUTE_IN_SECONDS );
		$response = wp_safe_remote_get( self::MANIFEST, array(
			'timeout'             => 10,
			'redirection'         => 5,
			'limit_response_size' => 65536,
			'user-agent'          => 'Adminlume updater (+https://github.com/adilorenzo10/adminlume)',
			'headers'             => array( 'Accept' => 'application/json' ),
		) );
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		$release = is_array( $data ) ? $this->validate( $data ) : null;
		if ( $release ) {
			set_site_transient( self::CACHE_KEY, $release, 6 * HOUR_IN_SECONDS );
		}
		return $release;
	}

	/**
	 * Reject prereleases, malformed requirements, and alternate package origins.
	 *
	 * @param array $data Untrusted manifest or cached metadata.
	 * @return array|null Normalized metadata, or null if invalid.
	 */
	private function validate( array $data ): ?array {
		if ( 1 !== ( $data['schema'] ?? null ) ) {
			return null;
		}
		foreach ( array( 'version', 'requires', 'requires_php', 'package', 'url', 'sha256', 'changelog' ) as $key ) {
			if ( ! isset( $data[ $key ] ) || ! is_string( $data[ $key ] ) ) {
				return null;
			}
		}
		if ( ! preg_match( '/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/D', $data['version'] ) ||
			! preg_match( '/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/D', $data['requires'] ) ||
			! preg_match( '/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/D', $data['requires_php'] ) ||
			! preg_match( '/^[a-f0-9]{64}$/D', $data['sha256'] ) ) {
			return null;
		}
		$tag = 'v' . $data['version'];
		if ( self::REPOSITORY . '/releases/tag/' . $tag !== $data['url'] ||
			self::REPOSITORY . '/releases/download/' . $tag . '/adminlume-' . $data['version'] . '.zip' !== $data['package'] ) {
			return null;
		}
		return array_intersect_key( $data, array_flip( array( 'schema', 'version', 'requires', 'requires_php', 'package', 'url', 'sha256', 'changelog' ) ) );
	}
}
