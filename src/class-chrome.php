<?php
/**
 * Native admin branding adjustments scoped to opted-in users.
 *
 * @package Adminlume
 */

declare(strict_types=1);

namespace Adminlume;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Personal chrome: frontend toolbar only for users who opted in. */
final class Chrome {

	/** Register admin-only toolbar and sidebar callbacks. */
	public function register(): void {
		add_action( 'admin_bar_menu', array( $this, 'toolbar' ), 999 );
		add_action( 'adminmenu', array( $this, 'site_link' ) );
	}

	/**
	 * Check opt-in and supported admin context.
	 *
	 * @return bool Whether branding adjustments are enabled.
	 */
	private function enabled(): bool {
		return is_user_logged_in() && ! is_network_admin() && ! is_user_admin() && ( new Settings() )->preferences()['enabled'];
	}

	/**
	 * Remove branding nodes only in the opted-in backend toolbar.
	 *
	 * @param \WP_Admin_Bar $bar Native toolbar.
	 */
	public function toolbar( \WP_Admin_Bar $bar ): void {
		if ( ! is_admin() ) {
			return;
		}
		if ( ! $this->enabled() ) {
			return;
		}

		$bar->remove_node( 'wp-logo' );
		if ( is_admin() ) {
			$bar->remove_node( 'site-name' );
		}
	}

	/** Output the escaped site link in the opted-in admin sidebar. */
	public function site_link(): void {
		if ( ! is_admin() || ! $this->enabled() ) {
			return;
		}

		$name = get_bloginfo( 'name' );
		$name = '' !== trim( $name ) ? $name : __( 'Visit site', 'adminlume' );
		/* translators: %s: Site name. */
		$title = sprintf( __( 'Visit site: %s', 'adminlume' ), $name );
		printf(
			'<li id="ra-site-link"><a href="%s" title="%s">%s</a></li>',
			esc_url( home_url( '/' ) ),
			esc_attr( $title ),
			esc_html( $name )
		);
	}
}
