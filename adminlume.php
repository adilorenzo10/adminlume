<?php
/**
 * Plugin Name: Adminlume
 * Description: A lightweight WordPress admin interface and frontend dock with personal preferences.
 * Version: 0.2.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Dilorsoft
 * Text Domain: adminlume
 * License: GPL-2.0-or-later
 */

declare(strict_types=1);

namespace Adminlume;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/src/Settings.php';
require_once __DIR__ . '/src/Assets.php';
require_once __DIR__ . '/src/Chrome.php';
require_once __DIR__ . '/src/FrontendToolbar.php';

add_action( 'init', static function (): void {
	load_plugin_textdomain( 'adminlume', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );

add_action( 'plugins_loaded', static function (): void {
	( new Settings() )->register();
	( new Assets( __FILE__ ) )->register();
	( new Chrome() )->register();
	( new FrontendToolbar( __FILE__ ) )->register();
} );
