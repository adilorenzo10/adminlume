<?php
/**
 * Theme-independent styling and enhancement of the native front-end toolbar.
 *
 * @package Adminlume
 */

declare(strict_types=1);

namespace Adminlume;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Owns only the native toolbar on authenticated public-site requests. */
final class FrontendToolbar {

	/**
	 * Store the entry path used to resolve standalone dock assets.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 */
	public function __construct( private readonly string $plugin_file ) {}

	/** Register front-end-only styling and native menu-node hooks. */
	public function register(): void {
		add_filter( 'body_class', array( $this, 'body_class' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ), 100 );
		add_action( 'admin_bar_menu', array( $this, 'nodes' ), 1000 );
	}

	/**
	 * Check authentication, opt-in, and native toolbar visibility.
	 *
	 * @return bool Whether the dock may be rendered.
	 */
	public static function enabled(): bool {
		return ! is_admin() && ! is_network_admin() && ! is_user_admin() && is_user_logged_in() && is_admin_bar_showing() && ( new Settings() )->preferences()['enabled'];
	}

	/**
	 * Append the front-end dock scope without changing other body classes.
	 *
	 * @param string[] $classes Existing body classes.
	 * @return string[] Updated classes.
	 */
	public function body_class( array $classes ): array {
		if ( self::enabled() ) {
			$classes[] = 'nzm-frontend-toolbar';
		}
		return $classes;
	}

	/** Enqueue standalone local dock assets and translated interface labels. */
	public function enqueue(): void {
		if ( ! self::enabled() ) {
			return;
		}
		remove_action( 'wp_head', '_admin_bar_bump_cb' );
		$base = dirname( $this->plugin_file ) . '/assets/';
		wp_enqueue_style( 'rounded-admin-frontend-toolbar', plugins_url( 'assets/css/frontend-toolbar.css', $this->plugin_file ), array( 'admin-bar', 'dashicons' ), (string) filemtime( $base . 'css/frontend-toolbar.css' ) );
		wp_enqueue_script( 'rounded-admin-frontend-toolbar', plugins_url( 'assets/js/frontend-toolbar.js', $this->plugin_file ), array( 'admin-bar' ), (string) filemtime( $base . 'js/frontend-toolbar.js' ), true );
		wp_localize_script(
			'rounded-admin-frontend-toolbar',
			'roundedAdminDock',
			array(
				'more'       => __( 'More actions', 'adminlume' ),
				'comments'   => __( 'Comments', 'adminlume' ),
				'hide'       => __( 'Hide admin toolbar', 'adminlume' ),
				'hideLabel'  => __( 'Hide', 'adminlume' ),
				'show'       => __( 'Show admin toolbar', 'adminlume' ),
				'storageKey' => 'rounded-admin-dock-' . get_current_blog_id() . '-' . get_current_user_id(),
			)
		);
	}

	/**
	 * Retain native nodes while arranging the personal front-end actions.
	 *
	 * @param \WP_Admin_Bar $bar Native toolbar.
	 */
	public function nodes( \WP_Admin_Bar $bar ): void {
		if ( ! self::enabled() ) {
			return;
		}
		if ( current_user_can( 'read' ) ) {
			$bar->add_node(
				array(
					'id'    => 'nzm-toolbar-dashboard',
					'title' => '<span class="ab-icon dashicons-before dashicons-admin-home" aria-hidden="true"></span><span class="nzm-dock-label">' . esc_html__( 'Dashboard', 'adminlume' ) . '</span>',
					'href'  => admin_url(),
				)
			);
		}
		$roots = array();
		foreach ( $bar->get_nodes() as $node ) {
			if ( empty( $node->parent ) && ! $node->group ) {
				$roots[ $node->id ] = $node;
			}
		}
		$order   = array( 'wp-logo', 'site-name', 'woocommerce-site-visibility-badge', 'nzm-toolbar-dashboard', 'customize', 'comments', 'new-content', 'edit' );
		$ordered = array();
		foreach ( $order as $id ) {
			if ( isset( $roots[ $id ] ) ) {
				$ordered[ $id ] = $roots[ $id ];
				unset( $roots[ $id ] );
			}
		}
		$ordered += $roots;
		foreach ( $ordered as $id => $node ) {
			$bar->remove_node( $id );
		}
		foreach ( $ordered as $node ) {
			$bar->add_node( (array) $node );
		}
	}
}
