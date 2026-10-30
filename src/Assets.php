<?php

declare(strict_types=1);

namespace Adminlume;

final class Assets {

	public function __construct( private readonly string $plugin_file ) {}

	public function register(): void {
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ), 100 );
		add_action( 'wp_enqueue_media', array( $this, 'enqueue_media' ) );
	}

	private function enabled(): bool {
		return ! is_network_admin() && ! is_user_admin() && ( new Settings() )->preferences()['enabled'];
	}

	public function body_class( string $classes ): string {
		return $this->enabled() ? $classes . ' rounded-admin' : $classes;
	}

	public function enqueue(): void {
		if ( ! $this->enabled() ) {
			return;
		}

		$screen = get_current_screen();
		if ( $screen && ! $screen->is_block_editor() ) {
			wp_enqueue_script( 'rounded-admin-sidebar', plugins_url( 'assets/js/sidebar.js', $this->plugin_file ), array(),
				(string) filemtime( dirname( $this->plugin_file ) . '/assets/js/sidebar.js' ), true );
			wp_localize_script( 'rounded-admin-sidebar', 'roundedAdminSidebar', array(
				'search' => __( 'Cerca nel menu', 'adminlume' ),
				'empty'  => __( 'Nessuna voce trovata.', 'adminlume' ),
				'clear'  => __( 'Cancella ricerca', 'adminlume' ),
			) );
		}
		$this->style( 'rounded-admin-toolbar', 'toolbar.css', array( 'admin-bar' ) );
		$this->style( 'rounded-admin', 'admin.css', array( 'rounded-admin-toolbar' ) );
		$this->add_preferences_styles( 'rounded-admin', 'body.rounded-admin' );
		if ( wp_style_is( 'media-views', 'enqueued' ) ) {
			$this->enqueue_media();
		}

		if ( $screen && ! $screen->is_block_editor() && (
			in_array( $screen->post_type, array( 'product', 'shop_order' ), true ) ||
			str_starts_with( $screen->id, 'woocommerce_page_' ) ||
			'edit-product_cat' === $screen->id
		) ) {
			$this->style( 'rounded-admin-woocommerce', 'woocommerce.css', array( 'rounded-admin' ) );
		}
	}

	private function add_preferences_styles( string $handle, string $selector ): void {
		$preferences = ( new Settings() )->preferences();
		$accent = $preferences['accent'];
		$foreground = self::foreground( $accent );
		$background = $preferences['chrome_background'];
		$light = '#000000' === self::foreground( $background );
		wp_add_inline_style( $handle, sprintf(
			'%s{--ra-accent:%s;--ra-accent-text:%s;--ra-radius:%dpx;--ra-chrome-bg:%s;}',
			$selector,
			$accent,
			$foreground,
			$preferences['radius'],
			$background
		) );
		$palette = $light ? array(
			'text' => '#303030', 'strong' => '#000000', 'muted' => '#616161', 'hover' => '#e3e3e3',
			'submenu' => '#f5f5f5', 'selected' => '#e8e8e8', 'selected-top' => '#e5e5e5', 'selected-bottom' => '#dddddd',
			'search-top' => '#efefef', 'search-bottom' => '#e8e8e8', 'focus' => '#555555',
		) : array(
			'text' => '#dedede', 'strong' => '#ffffff', 'muted' => '#aaaaaa', 'hover' => '#353535',
			'submenu' => '#222222', 'selected' => '#252525', 'selected-top' => '#333333', 'selected-bottom' => '#292929',
			'search-top' => '#3b3b3b', 'search-bottom' => '#333333', 'focus' => '#aaaaaa',
		);
		$variables = '';
		foreach ( $palette as $key => $value ) {
			$variables .= '--ra-chrome-' . $key . ':' . $value . ';';
		}
		wp_add_inline_style( $handle, $selector . '{' . $variables . '}' );
	}

	public function enqueue_media(): void {
		if ( ! is_admin() || ! $this->enabled() ) {
			return;
		}

		$this->style( 'rounded-admin-media', 'media.css', array( 'rounded-admin', 'media-views' ) );
	}

	private function style( string $handle, string $file, array $dependencies = array() ): void {
		$path = dirname( $this->plugin_file ) . '/assets/css/' . $file;
		wp_enqueue_style( $handle, plugins_url( 'assets/css/' . $file, $this->plugin_file ), $dependencies, (string) filemtime( $path ) );
	}

	/** Choose the higher-contrast black/white foreground using WCAG luminance. */
	public static function foreground( string $color ): string {
		$hex = ltrim( $color, '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}

		$channels = array();
		foreach ( array( 0, 2, 4 ) as $offset ) {
			$value = hexdec( substr( $hex, $offset, 2 ) ) / 255;
			$channels[] = $value <= 0.04045 ? $value / 12.92 : ( ( $value + 0.055 ) / 1.055 ) ** 2.4;
		}
		$luminance = $channels[0] * 0.2126 + $channels[1] * 0.7152 + $channels[2] * 0.0722;
		return ( $luminance + 0.05 ) / 0.05 >= 1.05 / ( $luminance + 0.05 ) ? '#000000' : '#ffffff';
	}
}
