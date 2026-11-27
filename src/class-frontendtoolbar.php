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
		Assets::register_palette( $this->plugin_file );
		wp_enqueue_style( 'adminlume-palette' );
		wp_enqueue_script( 'rounded-admin-frontend-toolbar', plugins_url( 'assets/js/frontend-toolbar.js', $this->plugin_file ), array( 'admin-bar', 'adminlume-palette' ), (string) filemtime( $base . 'js/frontend-toolbar.js' ), true );
		$menu = get_transient( Chrome::menu_cache_key( get_current_user_id() ) );
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
				'palette'    => array_merge(
					Assets::palette_strings(),
					array(
						/* translators: %s: Text typed into the command palette. */
						'searchSite' => __( 'Search the site for “%s”', 'adminlume' ),
					)
				),
				'searchUrl'  => home_url( '/' ),
				'menu'       => self::menu_for_script( is_array( $menu ) ? $menu : array() ),
			)
		);
	}

	/**
	 * Validate the cached admin menu before handing it to the dock script.
	 *
	 * @param array<int, mixed> $entries Cached entries.
	 * @return array<int, array{label: string, url: string, parent: string}> Plain-text labels and admin URLs.
	 */
	public static function menu_for_script( array $entries ): array {
		$clean = array();
		$admin = admin_url();
		foreach ( $entries as $entry ) {
			if ( ! is_array( $entry ) || ! isset( $entry['label'], $entry['url'] ) ) {
				continue;
			}
			$url = esc_url_raw( (string) $entry['url'] );
			if ( '' === $url || ! str_starts_with( $url, $admin ) ) {
				continue;
			}
			$clean[] = array(
				'label'  => sanitize_text_field( (string) $entry['label'] ),
				'url'    => $url,
				'parent' => sanitize_text_field( (string) ( $entry['parent'] ?? '' ) ),
			);
		}
		return $clean;
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
		$bar->add_node(
			array(
				'id'    => 'adminlume-dock-search',
				'title' => '<button type="button" class="ra-dock-search" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"><span class="ra-dock-search-icon" aria-hidden="true"></span><span class="ra-dock-search-label">' . esc_html__( 'Search', 'adminlume' ) . '</span><kbd class="ra-dock-search-kbd" aria-hidden="true">Ctrl K</kbd></button>',
			)
		);
		// The palette offers site search, so the native search form would only
		// fill the overflow menu with a single field. Core adds it at 9999.
		remove_action( 'admin_bar_menu', 'wp_admin_bar_search_menu', 9999 );
		$bar->remove_node( 'search' );
		// A zero moderation count is noise; Comments stays reachable in the palette.
		if ( $bar->get_node( 'comments' ) && 0 === (int) wp_count_comments()->moderated ) {
			$bar->remove_node( 'comments' );
		}
		if ( $bar->get_node( 'user-actions' ) ) {
			// Nodes render in insertion order: re-append logout so it stays last.
			$logout = $bar->get_node( 'logout' );
			if ( $logout ) {
				$bar->remove_node( 'logout' );
			}
			$bar->add_node(
				array(
					'parent' => 'user-actions',
					'id'     => 'adminlume-preferences',
					'title'  => esc_html__( 'Adminlume preferences', 'adminlume' ),
					'href'   => ( new Settings() )->url(),
				)
			);
			if ( $logout ) {
				$bar->add_node( (array) $logout );
			}
		}
		$roots = array();
		foreach ( $bar->get_nodes() as $node ) {
			if ( empty( $node->parent ) && ! $node->group ) {
				$roots[ $node->id ] = $node;
			}
		}
		$order   = array( 'wp-logo', 'site-name', 'woocommerce-site-visibility-badge', 'adminlume-dock-search', 'nzm-toolbar-dashboard', 'customize', 'comments', 'new-content', 'edit' );
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
