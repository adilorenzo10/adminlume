<?php
/**
 * Native admin toolbar structure scoped to opted-in users.
 *
 * @package Adminlume
 */

declare(strict_types=1);

namespace Adminlume;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds the workspace header nodes to the native admin toolbar.
 *
 * Every node is added through the WP_Admin_Bar API so existing core and
 * third-party nodes keep their IDs, capabilities, and event handlers. Client
 * code may regroup nodes on desktop, but never clones them.
 */
final class Chrome {

	/** Register admin-only toolbar and sidebar callbacks. */
	public function register(): void {
		add_action( 'admin_bar_menu', array( $this, 'leading_nodes' ), 1 );
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
	 * Check whether the workspace header applies to this request.
	 *
	 * The block editor keeps the compact native toolbar because its fixed
	 * interface is positioned against WordPress's 32px toolbar height.
	 *
	 * @return bool Whether workspace nodes may be added.
	 */
	private function workspace(): bool {
		if ( ! is_admin() || ! $this->enabled() ) {
			return false;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		return ! ( $screen && $screen->is_block_editor() );
	}

	/**
	 * Add the site, breadcrumb, and environment nodes before core nodes.
	 *
	 * @param \WP_Admin_Bar $bar Native toolbar.
	 */
	public function leading_nodes( \WP_Admin_Bar $bar ): void {
		if ( ! $this->workspace() ) {
			return;
		}

		$name = trim( wp_strip_all_tags( get_bloginfo( 'name' ) ) );
		$name = '' !== $name ? $name : __( 'Visit site', 'adminlume' );
		$bar->add_node(
			array(
				'id'    => 'adminlume-site',
				'title' => '<span class="ra-site-name">' . esc_html( $name ) . '</span>',
				'href'  => home_url( '/' ),
				'meta'  => array(
					/* translators: %s: Site name. */
					'title' => sprintf( __( 'Visit site: %s', 'adminlume' ), $name ),
					'class' => 'ra-workspace-node',
				),
			)
		);

		$crumbs = self::breadcrumb_markup( $this->breadcrumb() );
		if ( '' !== $crumbs ) {
			$bar->add_node(
				array(
					'id'    => 'adminlume-breadcrumb',
					'title' => $crumbs,
					'meta'  => array( 'class' => 'ra-workspace-node' ),
				)
			);
		}

		$environment = self::environment_label( wp_get_environment_type() );
		if ( '' !== $environment ) {
			$bar->add_node(
				array(
					'id'    => 'adminlume-environment',
					'title' => '<span class="ra-env ra-env-' . esc_attr( wp_get_environment_type() ) . '">' . esc_html( $environment ) . '</span>',
					'meta'  => array( 'class' => 'ra-workspace-node' ),
				)
			);
		}
	}

	/**
	 * Remove branding nodes and add search, notification, and overflow nodes.
	 *
	 * @param \WP_Admin_Bar $bar Native toolbar.
	 */
	public function toolbar( \WP_Admin_Bar $bar ): void {
		if ( ! is_admin() || ! $this->enabled() ) {
			return;
		}

		$bar->remove_node( 'wp-logo' );
		$bar->remove_node( 'site-name' );

		if ( ! $this->workspace() ) {
			return;
		}

		// Adminlume's palette owns Cmd/Ctrl+K and offers the core palette as an entry.
		$bar->remove_node( 'command-palette' );

		$search = __( 'Search or run a command…', 'adminlume' );
		$bar->add_node(
			array(
				'id'    => 'adminlume-search',
				'title' => sprintf(
					'<button type="button" class="ra-search-trigger" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"><span class="ra-search-icon" aria-hidden="true"></span><span class="ra-search-label">%1$s</span><kbd class="ra-search-kbd" aria-hidden="true">%2$s</kbd></button>',
					esc_html( $search ),
					esc_html__( 'Ctrl K', 'adminlume' )
				),
				'meta'  => array( 'class' => 'ra-workspace-node ra-js-only' ),
			)
		);

		$this->notifications( $bar );

		$bar->add_node(
			array(
				'id'    => 'adminlume-more',
				'title' => '<span class="ra-more-icon" aria-hidden="true"></span><span class="screen-reader-text">' . esc_html__( 'More tools', 'adminlume' ) . '</span>',
				'meta'  => array(
					'class'    => 'ra-workspace-node ra-js-only',
					'tabindex' => 0,
				),
			)
		);
		$bar->add_node(
			array(
				'parent' => 'adminlume-more',
				'id'     => 'adminlume-more-heading',
				'title'  => esc_html__( 'From other plugins', 'adminlume' ),
				'meta'   => array( 'class' => 'ra-menu-heading' ),
			)
		);

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
	}

	/**
	 * Add a notification parent for the native update and comment nodes.
	 *
	 * The native nodes stay top-level in markup; client code moves them into
	 * this menu on desktop and restores them for the native mobile toolbar.
	 *
	 * @param \WP_Admin_Bar $bar Native toolbar.
	 */
	private function notifications( \WP_Admin_Bar $bar ): void {
		$total = 0;
		if ( $bar->get_node( 'updates' ) ) {
			$total += (int) ( wp_get_update_data()['counts']['total'] ?? 0 );
		}
		if ( $bar->get_node( 'comments' ) ) {
			$total += (int) wp_count_comments()->moderated;
		}

		$label = 0 < $total
			/* translators: %s: Number of pending notifications. */
			? sprintf( __( 'Notifications: %s', 'adminlume' ), number_format_i18n( $total ) )
			: __( 'No notifications', 'adminlume' );
		$count = 0 < $total ? '<span class="ra-count" aria-hidden="true">' . esc_html( number_format_i18n( $total ) ) . '</span>' : '';

		$bar->add_node(
			array(
				'id'    => 'adminlume-notifications',
				'title' => '<span class="ra-bell-icon" aria-hidden="true"></span>' . $count . '<span class="screen-reader-text">' . esc_html( $label ) . '</span>',
				'meta'  => array(
					'class'    => 'ra-workspace-node ra-js-only',
					'tabindex' => 0,
				),
			)
		);

		if ( current_user_can( 'update_core' ) || current_user_can( 'update_plugins' ) || current_user_can( 'update_themes' ) ) {
			$footer = array( __( 'All updates', 'adminlume' ), admin_url( 'update-core.php' ) );
		} elseif ( current_user_can( 'edit_posts' ) ) {
			$footer = array( __( 'Comments', 'adminlume' ), admin_url( 'edit-comments.php' ) );
		} else {
			$footer = array( __( 'Dashboard', 'adminlume' ), admin_url() );
		}
		$bar->add_node(
			array(
				'parent' => 'adminlume-notifications',
				'id'     => 'adminlume-notifications-footer',
				'title'  => esc_html( $footer[0] ),
				'href'   => $footer[1],
				'meta'   => array( 'class' => 'ra-menu-footer' ),
			)
		);
	}

	/**
	 * Build the current admin location from WordPress's own menu globals.
	 *
	 * @return array<int, array{label: string, url: string}> Ordered crumbs.
	 */
	private function breadcrumb(): array {
		global $menu, $parent_file;

		$crumbs = array();
		$parent = is_string( $parent_file ) ? $parent_file : '';
		if ( '' !== $parent && is_array( $menu ) ) {
			foreach ( $menu as $item ) {
				if ( isset( $item[0], $item[2] ) && $item[2] === $parent ) {
					$label = self::menu_label( (string) $item[0] );
					if ( '' !== $label ) {
						$crumbs[] = array(
							'label' => $label,
							'url'   => self::menu_url( $parent ),
						);
					}
					break;
				}
			}
		}

		$current = $this->current_title();
		if ( '' !== $current && ( ! $crumbs || 0 !== strcasecmp( $crumbs[0]['label'], $current ) ) ) {
			$crumbs[] = array(
				'label' => $current,
				'url'   => '',
			);
		}

		return $crumbs;
	}

	/**
	 * Resolve the current screen title, preferring an edited post's title.
	 *
	 * @return string Plain-text title.
	 */
	private function current_title(): string {
		$screen = get_current_screen();
		$post   = get_post();
		if ( $screen && 'post' === $screen->base && 'add' !== $screen->action && $post instanceof \WP_Post ) {
			$title = trim( wp_strip_all_tags( get_the_title( $post ) ) );
			if ( '' !== $title ) {
				return $title;
			}
		}

		return trim( wp_strip_all_tags( (string) get_admin_page_title() ) );
	}

	/**
	 * Remove count badges and markup from a native menu label.
	 *
	 * @param string $label Menu label, possibly containing count markup.
	 * @return string Plain-text label.
	 */
	public static function menu_label( string $label ): string {
		$label = (string) preg_replace( '#<span\b[^>]*class=["\'][^"\']*(?:awaiting-mod|update-plugins|count|screen-reader-text)[^"\']*["\'][^>]*>.*?</span>#is', '', $label );
		return trim( html_entity_decode( wp_strip_all_tags( $label ), ENT_QUOTES, 'UTF-8' ) );
	}

	/**
	 * Resolve a top-level menu slug to an admin URL.
	 *
	 * @param string $slug Native menu slug.
	 * @return string Admin URL.
	 */
	public static function menu_url( string $slug ): string {
		return str_contains( $slug, '.php' ) ? admin_url( $slug ) : admin_url( 'admin.php?page=' . rawurlencode( $slug ) );
	}

	/**
	 * Render escaped breadcrumb markup.
	 *
	 * @param array<int, array{label: string, url: string}> $crumbs Ordered crumbs.
	 * @return string Escaped HTML, or an empty string without crumbs.
	 */
	public static function breadcrumb_markup( array $crumbs ): string {
		$crumbs = array_values( array_filter( $crumbs, static fn( array $crumb ): bool => '' !== $crumb['label'] ) );
		if ( ! $crumbs ) {
			return '';
		}

		$last = count( $crumbs ) - 1;
		$html = '<span class="ra-crumbs">';
		foreach ( $crumbs as $index => $crumb ) {
			if ( $index ) {
				$html .= '<span class="ra-crumb-sep" aria-hidden="true"></span>';
			}
			if ( $index !== $last && '' !== $crumb['url'] ) {
				$html .= '<a class="ra-crumb" href="' . esc_url( $crumb['url'] ) . '">' . esc_html( $crumb['label'] ) . '</a>';
			} else {
				$html .= '<span class="ra-crumb ra-crumb-current"' . ( $index === $last ? ' aria-current="page"' : '' ) . '>' . esc_html( $crumb['label'] ) . '</span>';
			}
		}
		return $html . '</span>';
	}

	/**
	 * Label non-production environments; production shows no badge.
	 *
	 * @param string $type Value of wp_get_environment_type().
	 * @return string Translated label, or an empty string.
	 */
	public static function environment_label( string $type ): string {
		return match ( $type ) {
			'staging'     => __( 'Staging', 'adminlume' ),
			'development' => __( 'Development', 'adminlume' ),
			'local'       => __( 'Local', 'adminlume' ),
			default       => '',
		};
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
