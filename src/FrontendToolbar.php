<?php

declare(strict_types=1);

namespace Adminlume;

/** Owns only the native toolbar on authenticated public-site requests. */
final class FrontendToolbar {

	public function __construct( private readonly string $plugin_file ) {}

	public function register(): void {
		add_filter( 'body_class', array( $this, 'body_class' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ), 100 );
		add_action( 'admin_bar_menu', array( $this, 'nodes' ), 1000 );
	}

	public static function enabled(): bool {
		return ! is_admin() && ! is_network_admin() && ! is_user_admin() && is_user_logged_in() && is_admin_bar_showing() && ( new Settings() )->preferences()['enabled'];
	}

	public function body_class( array $classes ): array {
		if ( self::enabled() ) $classes[] = 'nzm-frontend-toolbar';
		return $classes;
	}

	public function enqueue(): void {
		if ( ! self::enabled() ) return;
		remove_action( 'wp_head', '_admin_bar_bump_cb' );
		$base = dirname( $this->plugin_file ) . '/assets/';
		wp_enqueue_style( 'rounded-admin-frontend-toolbar', plugins_url( 'assets/css/frontend-toolbar.css', $this->plugin_file ), array( 'admin-bar', 'dashicons' ), (string) filemtime( $base . 'css/frontend-toolbar.css' ) );
		wp_enqueue_script( 'rounded-admin-frontend-toolbar', plugins_url( 'assets/js/frontend-toolbar.js', $this->plugin_file ), array( 'admin-bar' ), (string) filemtime( $base . 'js/frontend-toolbar.js' ), true );
		wp_localize_script( 'rounded-admin-frontend-toolbar', 'roundedAdminDock', array(
			'more' => __( 'Altre azioni', 'adminlume' ),
			'comments' => __( 'Commenti', 'adminlume' ),
			'site' => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'siteMenu' => __( 'Site menu', 'adminlume' ),
			'account' => __( 'Account menu', 'adminlume' ),
			'collapse' => __( 'Collapse toolbar', 'adminlume' ),
			'expand' => __( 'Expand toolbar', 'adminlume' ),
			'toolbar' => __( 'Site actions', 'adminlume' ),
			'storageKey' => 'rounded-admin-dock-' . get_current_blog_id() . '-' . get_current_user_id(),
		) );
	}

	public function nodes( \WP_Admin_Bar $bar ): void {
		if ( ! self::enabled() ) return;
		if ( current_user_can( 'read' ) ) {
			$bar->add_node( array(
				'id' => 'nzm-toolbar-dashboard',
				'title' => '<span class="ab-icon dashicons-before dashicons-admin-home" aria-hidden="true"></span><span class="nzm-dock-label">' . esc_html__( 'Dashboard', 'adminlume' ) . '</span>',
				'href' => admin_url(),
			) );
		}
		// Restyle existing, capability-checked actions; never invent an edit URL.
		$edit = $bar->get_node( 'edit' );
		if ( $edit && is_singular() && ! empty( $edit->href ) ) {
			$post_type = get_post_type_object( get_post_type( get_queried_object_id() ) );
			if ( $post_type ) {
				$bar->add_node( array( 'id' => 'edit', 'title' => esc_html( $post_type->labels->edit_item ) ) );
			}
		}
		$customize = $bar->get_node( 'customize' );
		if ( ! $edit && is_front_page() && $customize && ! empty( $customize->href ) ) {
			$meta = (array) $customize->meta;
			$meta['class'] = trim( ( $meta['class'] ?? '' ) . ' nzm-primary-action' );
			$bar->add_node( array(
				'id' => 'customize',
				'title' => esc_html__( 'Customize site', 'adminlume' ),
				'meta' => $meta,
			) );
		}
		if ( current_user_can( 'read' ) && $bar->get_node( 'my-account' ) ) {
			$bar->add_node( array(
				'id' => 'nzm-toolbar-preferences',
				'parent' => 'user-actions',
				'title' => esc_html__( 'Toolbar preferences', 'adminlume' ),
				'href' => admin_url( ( current_user_can( 'list_users' ) ? 'users.php' : 'profile.php' ) . '?page=' . Settings::PAGE ),
			) );
		}
	}
}
