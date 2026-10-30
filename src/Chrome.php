<?php

declare(strict_types=1);

namespace Adminlume;

/** Personal chrome: frontend toolbar only for users who opted in. */
final class Chrome {

	public function register(): void {
		add_action( 'admin_bar_menu', array( $this, 'toolbar' ), 999 );
		add_action( 'adminmenu', array( $this, 'site_link' ) );
	}

	private function enabled(): bool {
		return is_user_logged_in() && ! is_network_admin() && ! is_user_admin() && ( new Settings() )->preferences()['enabled'];
	}

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

	public function site_link(): void {
		if ( ! is_admin() || ! $this->enabled() ) {
			return;
		}

		$name = get_bloginfo( 'name' );
		$name = '' !== trim( $name ) ? $name : __( 'Visita il sito', 'adminlume' );
		printf(
			'<li id="ra-site-link"><a href="%s" title="%s">%s</a></li>',
			esc_url( home_url( '/' ) ),
			esc_attr( sprintf( __( 'Visita il sito: %s', 'adminlume' ), $name ) ),
			esc_html( $name )
		);
	}
}
