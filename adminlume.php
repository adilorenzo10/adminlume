<?php
/**
 * Plugin Name: Adminlume
 * Description: A lightweight WordPress admin interface and frontend dock with personal preferences.
 * Version: 0.3.7
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Dilorsoft
 * Plugin URI: https://github.com/adilorenzo10/adminlume
 * Update URI: https://github.com/adilorenzo10/adminlume
 * Text Domain: adminlume
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 *
 * @package Adminlume
 * @copyright 2026 Dilorsoft
 * @license GPL-2.0-or-later
 *
 * Adminlume is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 2 of the License, or (at your option) any later version.
 *
 * Adminlume is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the LICENSE file distributed with this plugin for the full terms.
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
require_once __DIR__ . '/src/Updater.php';

// Register independently of personal appearance preferences, including cron.
( new Updater( __FILE__ ) )->register();

add_action( 'init', static function (): void {
	load_plugin_textdomain( 'adminlume', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );

add_action( 'plugins_loaded', static function (): void {
	( new Settings() )->register();
	( new Assets( __FILE__ ) )->register();
	( new Chrome() )->register();
	( new FrontendToolbar( __FILE__ ) )->register();
} );
