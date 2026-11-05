<?php
/** Run via WP-CLI on an isolated local WordPress installation. */

use Adminlume\Assets;
use Adminlume\Settings;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || 'local' !== wp_get_environment_type() ||
	! in_array( wp_parse_url( home_url(), PHP_URL_HOST ), array( 'localhost', '127.0.0.1' ), true ) ) {
	throw new RuntimeException( 'Local WP-CLI only.' );
}

require_once ABSPATH . 'wp-admin/includes/screen.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . WPINC . '/class-wp-admin-bar.php';

$previous_user = get_current_user_id();
$previous_screen = $GLOBALS['current_screen'] ?? null;
$previous_admin_bar = $GLOBALS['show_admin_bar'] ?? null;
$front_bar_filter = null;
$previous_query = $GLOBALS['wp_query'] ?? null;
$previous_post = $GLOBALS['post'] ?? null;
$front_page_option = static fn() => 'posts';
$previous_method = $_SERVER['REQUEST_METHOD'] ?? null;
$previous_request = $_REQUEST;
$die_handler = static fn() => static function ( $message, $title, $args ): void {
	throw new RuntimeException( 'Expected blocked settings request.', (int) ( $args['response'] ?? 0 ) );
};
$user_id = wp_insert_user( array( 'user_login' => 'rounded-test-' . wp_generate_uuid4(), 'user_pass' => wp_generate_password( 40 ), 'role' => 'subscriber' ) );
if ( is_wp_error( $user_id ) ) {
	throw new RuntimeException( 'Cannot create isolated test user.' );
}

$checks = 0;
$check = static function ( bool $condition, string $message ) use ( &$checks ): void {
	if ( ! $condition ) {
		throw new RuntimeException( 'FAIL: ' . $message );
	}
	++$checks;
};

try {
	wp_set_current_user( $user_id );
	$settings = new Settings();
	$headers = get_plugin_data( WP_PLUGIN_DIR . '/adminlume/adminlume.php', false, false );
	$check( '' === $headers['UpdateURI'] && ! class_exists( 'Adminlume\\Updater' ), 'directory edition has no external updater or Update URI' );
	foreach ( array( 'update_plugins_github.com', 'plugins_api', 'upgrader_pre_download' ) as $hook ) {
		$own_callback = false;
		foreach ( $GLOBALS['wp_filter'][ $hook ]->callbacks ?? array() as $callbacks ) {
			foreach ( $callbacks as $entry ) {
				$callback = $entry['function'];
				if ( is_array( $callback ) && is_object( $callback[0] ) && str_starts_with( get_class( $callback[0] ), 'Adminlume\\' ) ) $own_callback = true;
			}
		}
		$check( ! $own_callback, 'directory edition does not override ' . $hook );
	}
	add_filter( 'wp_die_handler', $die_handler, PHP_INT_MAX );
	$_SERVER['REQUEST_METHOD'] = 'GET';
	$blocked = false;
	try {
		$settings->save();
	} catch ( RuntimeException $error ) {
		$blocked = 405 === $error->getCode();
	}
	$check( $blocked, 'state-changing settings requests require POST' );
	$_SERVER['REQUEST_METHOD'] = 'POST';
	$_REQUEST['_wpnonce'] = 'invalid-test-nonce';
	$blocked = false;
	try {
		$settings->save();
	} catch ( RuntimeException $error ) {
		$blocked = 403 === $error->getCode();
	}
	$check( $blocked && ! metadata_exists( 'user', $user_id, Settings::META_KEY ), 'invalid nonce cannot save preferences' );
	remove_filter( 'wp_die_handler', $die_handler, PHP_INT_MAX );
	$_REQUEST = $previous_request;
	$assets = new Assets( WP_PLUGIN_DIR . '/adminlume/adminlume.php' );
	set_current_screen( 'dashboard' );
	$check( ! $settings->preferences()['enabled'], 'new users default to native appearance' );
	update_user_meta( $user_id, Settings::LEGACY_META_KEY, array( 'enabled' => true, 'accent' => '#123456', 'radius' => 12 ) );
	$check( $settings->preferences()['enabled'] && '#123456' === $settings->preferences()['accent'], 'legacy Rounded Admin preferences survive renaming' );
	update_user_meta( $user_id, Settings::META_KEY, array( 'enabled' => false ) );
	$check( ! $settings->preferences()['enabled'], 'explicit Adminlume opt-out overrides legacy opt-in' );
	$check( get_user_meta( $user_id, Settings::LEGACY_META_KEY, true )['enabled'], 'migration never deletes legacy preferences' );
	delete_user_meta( $user_id, Settings::META_KEY );
	delete_user_meta( $user_id, Settings::LEGACY_META_KEY );
	$check( 'native' === $assets->body_class( 'native' ), 'opt-out does not add skin class' );
	$assets->enqueue();
	$check( ! wp_style_is( 'rounded-admin', 'enqueued' ), 'opt-out loads no stylesheet' );
	$check( ! wp_script_is( 'rounded-admin-sidebar', 'enqueued' ), 'opt-out loads no sidebar script' );
	$clean = $settings->sanitize( array( 'enabled' => 1, 'accent' => 'red;}body{display:none}', 'radius' => 999 ) );
	$check( '#303030' === $clean['accent'] && 16 === $clean['radius'], 'invalid CSS values rejected' );
	$check( '#000000' === $settings->preferences()['chrome_background'], 'chrome background defaults to black' );
	$check( '#000000' === $settings->sanitize( array( 'chrome_background' => 'red;}body{display:none}' ) )['chrome_background'], 'invalid chrome background rejected' );
	$check( '#123456' === $settings->sanitize( array( 'chrome_background' => '#123456' ) )['chrome_background'], 'custom chrome background accepted independently of accent' );
	$check( '#abc' === $settings->sanitize( array( 'accent' => '#abc', 'radius' => 12 ) )['accent'], 'valid short hex accepted' );
	$check( 12 === $settings->sanitize( array( 'radius' => '12' ) )['radius'], 'allowed radius normalized' );
	$check( '#ffffff' === Assets::foreground( '#000000' ) && '#000000' === Assets::foreground( '#ffffff' ), 'contrast foreground chooses correct extreme' );
	$check( '#000000' === Assets::foreground( '#fff' ), 'short hex contrast supported' );
	update_user_meta( $user_id, Settings::META_KEY, array( 'enabled' => true, 'accent' => '#303030', 'radius' => 16 ) );
	$check( str_contains( $assets->body_class( 'native' ), ' rounded-admin' ), 'opt-in adds namespaced class' );
	$chrome = new \Adminlume\Chrome();
	$bar = new WP_Admin_Bar();
	$bar->add_node( array( 'id' => 'wp-logo', 'title' => 'WordPress' ) );
	$bar->add_node( array( 'id' => 'site-name', 'title' => 'Site' ) );
	$bar->add_node( array( 'id' => 'comments', 'title' => 'Comments' ) );
	$chrome->toolbar( $bar );
	$check( ! $bar->get_node( 'wp-logo' ) && ! $bar->get_node( 'site-name' ) && (bool) $bar->get_node( 'comments' ), 'personal toolbar removes only requested nodes' );
	ob_start(); $chrome->site_link(); $site_html = ob_get_clean();
	$check( str_contains( $site_html, 'id="ra-site-link"' ) && str_contains( $site_html, esc_url( home_url( '/' ) ) ), 'sidebar contains escaped clickable site name' );
	$assets->enqueue();
	$check( wp_style_is( 'rounded-admin', 'enqueued' ), 'opt-in enqueues base stylesheet' );
	$check( ! wp_style_is( 'rounded-admin-woocommerce', 'enqueued' ), 'dashboard does not load WooCommerce stylesheet' );
	$check( wp_script_is( 'rounded-admin-sidebar', 'enqueued' ) && array() === wp_scripts()->registered['rounded-admin-sidebar']->deps, 'sidebar script has no library dependencies' );
	$check( ! wp_style_is( 'rounded-admin-media', 'enqueued' ), 'dashboard without media has no media skin' );
	$assets->enqueue_media();
	$check( wp_style_is( 'rounded-admin-media', 'enqueued' ), 'native media activation loads media skin' );
	wp_dequeue_style( 'rounded-admin-media' );
	set_current_screen( 'edit-product' );
	$assets->enqueue();
	$check( wp_style_is( 'rounded-admin-woocommerce', 'enqueued' ), 'product screen loads WooCommerce integration' );
	wp_dequeue_style( 'rounded-admin-woocommerce' );
	set_current_screen( 'post' );
	get_current_screen()->is_block_editor( true );
	wp_dequeue_script( 'rounded-admin-sidebar' );
	$assets->enqueue();
	$check( ! wp_script_is( 'rounded-admin-sidebar', 'enqueued' ), 'block editor avoids sidebar scroll enhancement' );
	$check( ! wp_style_is( 'rounded-admin-woocommerce', 'enqueued' ), 'block editor avoids classic WooCommerce overrides' );
	wp_dequeue_style( 'rounded-admin' );
	wp_set_current_user( 0 );
	$check( ! $settings->preferences()['enabled'], 'personal preferences do not leak between users' );
	$bar->add_node( array( 'id' => 'wp-logo', 'title' => 'WordPress' ) );
	$chrome->toolbar( $bar );
	$check( (bool) $bar->get_node( 'wp-logo' ), 'toolbar unchanged for opted-out users' );
	ob_start(); $chrome->site_link(); $site_html = ob_get_clean();
	$check( '' === $site_html, 'no sidebar branding for opted-out users' );
	$assets->enqueue_media();
	$check( ! wp_style_is( 'rounded-admin-media', 'enqueued' ), 'opt-out does not load media skin' );
	ob_start(); $settings->render(); $html = ob_get_clean();
	$check( '' === $html, 'anonymous user cannot render settings' );
	wp_set_current_user( $user_id );
	ob_start(); $settings->render(); $html = ob_get_clean();
	$check( str_contains( $html, 'name="_wpnonce"' ) && ! str_contains( $html, 'name="user_id"' ), 'personal form has nonce and no client-controlled user ID' );
	$check( str_contains( $html, 'admin-post.php' ), 'form posts to WordPress authenticated handler' );
	$GLOBALS['current_screen'] = null;
	$GLOBALS['show_admin_bar'] = true;
	// WP-CLI hides the toolbar by filter: emulate HTTP visibility for these checks.
	$front_bar_visible = true;
	$front_bar_filter = static function () use ( &$front_bar_visible ): bool { return $front_bar_visible; };
	add_filter( 'show_admin_bar', $front_bar_filter, PHP_INT_MAX );
	wp_dequeue_style( 'rounded-admin' );
	wp_dequeue_style( 'rounded-admin-toolbar' );
	$frontend = new \Adminlume\FrontendToolbar( WP_PLUGIN_DIR . '/adminlume/adminlume.php' );
	$frontend->enqueue();
	$check( wp_style_is( 'rounded-admin-frontend-toolbar', 'enqueued' ) && ! wp_style_is( 'rounded-admin', 'enqueued' ), 'frontend loads standalone dock only, not admin skin' );
	$check( in_array( 'nzm-frontend-toolbar', $frontend->body_class( array() ), true ), 'frontend toolbar scope enabled for opted-in user' );
	$check( str_contains( wp_styles()->registered['rounded-admin-frontend-toolbar']->src, '/plugins/adminlume/' ) && str_contains( wp_scripts()->registered['rounded-admin-frontend-toolbar']->src, '/plugins/adminlume/' ), 'frontend assets belong to plugin, not theme' );
	$front_bar = new WP_Admin_Bar();
	$front_bar->add_node( array( 'id' => 'wp-logo', 'title' => 'WordPress' ) );
	$front_bar->add_node( array( 'id' => 'site-name', 'title' => 'Site' ) );
	$chrome->toolbar( $front_bar );
	$frontend->nodes( $front_bar );
	$check( (bool) $front_bar->get_node( 'wp-logo' ) && (bool) $front_bar->get_node( 'site-name' ) && (bool) $front_bar->get_node( 'nzm-toolbar-dashboard' ), 'frontend preserves native branding and adds permitted Dashboard' );
	// Reuse existing query fixtures without creating or modifying site content.
	$query = new WP_Query();
	$query->is_singular = true;
	$GLOBALS['wp_query'] = $query;
	foreach ( array( 'page', 'post', 'product' ) as $type ) {
		if ( ! post_type_exists( $type ) ) continue;
		$objects = get_posts( array( 'post_type' => $type, 'post_status' => 'any', 'numberposts' => 1 ) );
		if ( ! $objects ) continue;
		$GLOBALS['post'] = $objects[0];
		$query->queried_object = $GLOBALS['post'];
		$query->queried_object_id = $GLOBALS['post']->ID;
		$context_bar = new WP_Admin_Bar();
		$context_bar->add_node( array( 'id' => 'edit', 'title' => 'Original edit', 'href' => '/native-editor', 'meta' => array( 'class' => 'plugin-edit', 'target' => '_blank' ) ) );
		$frontend->nodes( $context_bar );
		$edit = $context_bar->get_node( 'edit' );
		$check( 'Original edit' === $edit->title, $type . ' preserves the native edit label' );
		$check( '/native-editor' === $edit->href && 'plugin-edit' === $edit->meta['class'] && '_blank' === $edit->meta['target'], $type . ' preserves native edit URL and third-party metadata' );
	}
	$query->is_singular = false;
	$query->is_home = true;
	add_filter( 'pre_option_show_on_front', $front_page_option );
	$home_bar = new WP_Admin_Bar();
	$home_bar->add_node( array( 'id' => 'customize', 'title' => 'Native Customize', 'href' => '/native-customizer', 'meta' => array( 'class' => 'hide-if-no-customize', 'target' => '_blank' ) ) );
	$home_bar->add_node( array( 'id' => 'my-account', 'href' => '/native-profile' ) );
	$frontend->nodes( $home_bar );
	$customize = $home_bar->get_node( 'customize' );
	$check( 'Native Customize' === $customize->title && 'hide-if-no-customize' === $customize->meta['class'], 'homepage preserves native customizer presentation' );
	$check( '/native-customizer' === $customize->href && '_blank' === $customize->meta['target'], 'homepage customizer keeps original destination and metadata' );
	$check( '/native-profile' === $home_bar->get_node( 'my-account' )->href && ! $home_bar->get_node( 'nzm-toolbar-preferences' ), 'native account link is preserved without extra profile actions' );
	$empty_bar = new WP_Admin_Bar();
	$frontend->nodes( $empty_bar );
	$check( ! $empty_bar->get_node( 'edit' ) && ! $empty_bar->get_node( 'customize' ), 'no edit or customize action is invented when WordPress provides none' );
	remove_filter( 'pre_option_show_on_front', $front_page_option );
	$GLOBALS['wp_query'] = $previous_query;
	$GLOBALS['post'] = $previous_post;
	wp_dequeue_style( 'rounded-admin-frontend-toolbar' );
	wp_dequeue_script( 'rounded-admin-frontend-toolbar' );
	$preferences = get_user_meta( $user_id, Settings::META_KEY, true );
	update_user_meta( $user_id, Settings::META_KEY, array( 'enabled' => false ) );
	$frontend->enqueue();
	$check( ! wp_style_is( 'rounded-admin-frontend-toolbar', 'enqueued' ) && array() === $frontend->body_class( array() ), 'opted-out users retain native frontend toolbar' );
	update_user_meta( $user_id, Settings::META_KEY, $preferences );
	$GLOBALS['show_admin_bar'] = false;
	$front_bar_visible = false;
	$frontend->enqueue();
	$check( ! wp_style_is( 'rounded-admin-frontend-toolbar', 'enqueued' ) && array() === $frontend->body_class( array() ), 'hidden frontend bar does not load skin' );
	$GLOBALS['show_admin_bar'] = true;
	$front_bar_visible = true;
	wp_set_current_user( 0 );
	$frontend->enqueue();
	$check( ! wp_style_is( 'rounded-admin-frontend-toolbar', 'enqueued' ) && array() === $frontend->body_class( array() ), 'guests receive no frontend toolbar assets or class' );
	WP_CLI::success( $checks . ' Adminlume integration checks passed.' );
} finally {
	remove_filter( 'wp_die_handler', $die_handler, PHP_INT_MAX );
	$_REQUEST = $previous_request;
	if ( null === $previous_method ) unset( $_SERVER['REQUEST_METHOD'] );
	else $_SERVER['REQUEST_METHOD'] = $previous_method;
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_set_current_user( $previous_user );
	wp_delete_user( $user_id );
	$GLOBALS['current_screen'] = $previous_screen;
	$GLOBALS['show_admin_bar'] = $previous_admin_bar;
	$GLOBALS['wp_query'] = $previous_query;
	$GLOBALS['post'] = $previous_post;
	remove_filter( 'pre_option_show_on_front', $front_page_option );
	if ( null !== $front_bar_filter ) remove_filter( 'show_admin_bar', $front_bar_filter, PHP_INT_MAX );
	wp_dequeue_style( 'rounded-admin' );
	wp_dequeue_style( 'rounded-admin-woocommerce' );
	wp_dequeue_style( 'rounded-admin-media' );
	wp_dequeue_style( 'rounded-admin-toolbar' );
	wp_dequeue_script( 'rounded-admin-sidebar' );
	wp_dequeue_style( 'rounded-admin-frontend-toolbar' );
	wp_dequeue_script( 'rounded-admin-frontend-toolbar' );
}
