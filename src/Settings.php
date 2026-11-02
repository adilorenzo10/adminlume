<?php

declare(strict_types=1);

namespace Adminlume;

final class Settings {

	public const META_KEY = 'adminlume_preferences';
	public const LEGACY_META_KEY = 'rounded_admin_preferences';
	public const PAGE = 'adminlume';

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_post_adminlume_save', array( $this, 'save' ) );
		add_filter( 'plugin_action_links_adminlume/adminlume.php', array( $this, 'links' ) );
	}

	public function preferences(): array {
		$id = get_current_user_id();
		$key = metadata_exists( 'user', $id, self::META_KEY ) ? self::META_KEY : self::LEGACY_META_KEY;
		return $this->sanitize( get_user_meta( $id, $key, true ) );
	}

	public function sanitize( mixed $input ): array {
		$input = is_array( $input ) ? $input : array();
		$accent = is_string( $input['accent'] ?? null ) ? sanitize_hex_color( $input['accent'] ) : null;
		$background = is_string( $input['chrome_background'] ?? null ) ? sanitize_hex_color( $input['chrome_background'] ) : null;
		$radius = is_scalar( $input['radius'] ?? null ) ? (int) $input['radius'] : 16;

		return array(
			'enabled' => ! empty( $input['enabled'] ),
			'accent'  => $accent ?: '#303030',
			'chrome_background' => $background ?: '#000000',
			'radius'  => in_array( $radius, array( 8, 12, 16 ), true ) ? $radius : 16,
		);
	}

	public function menu(): void {
		add_submenu_page(
			current_user_can( 'list_users' ) ? 'users.php' : 'profile.php',
			__( 'Adminlume', 'adminlume' ),
			__( 'Adminlume', 'adminlume' ),
			'read',
			self::PAGE,
			array( $this, 'render' )
		);
	}

	public function links( array $links ): array {
		array_unshift( $links, '<a href="' . esc_url( $this->url() ) . '">' . esc_html__( 'Personal preferences', 'adminlume' ) . '</a>' );
		return $links;
	}

	private function url(): string {
		return admin_url( ( current_user_can( 'list_users' ) ? 'users.php' : 'profile.php' ) . '?page=' . self::PAGE );
	}

	public function save(): void {
		if ( ! current_user_can( 'read' ) ) {
			wp_die( esc_html__( 'Access denied.', 'adminlume' ), '', array( 'response' => 403 ) );
		}

		check_admin_referer( 'adminlume_save_' . get_current_user_id() );
		$preferences = $this->sanitize( wp_unslash( $_POST['preferences'] ?? array() ) );
		update_user_meta( get_current_user_id(), self::META_KEY, $preferences );
		wp_safe_redirect( add_query_arg( 'saved', '1', $this->url() ) );
		exit;
	}

	public function render(): void {
		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		$preferences = $this->preferences();
		?>
		<div class="wrap ra-preferences">
			<h1><?php esc_html_e( 'Adminlume', 'adminlume' ); ?></h1>
			<p><?php esc_html_e( 'A softer interface without changing how you work. These preferences apply only to your account.', 'adminlume' ); ?></p>
			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Preferences saved.', 'adminlume' ); ?></p></div>
			<?php endif; ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="adminlume_save">
				<?php wp_nonce_field( 'adminlume_save_' . get_current_user_id() ); ?>
				<table class="form-table" role="presentation">
					<tr><th scope="row"><?php esc_html_e( 'Appearance', 'adminlume' ); ?></th><td>
						<label><input type="checkbox" name="preferences[enabled]" value="1" <?php checked( $preferences['enabled'] ); ?>> <?php esc_html_e( 'Enable Adminlume for me', 'adminlume' ); ?></label>
						<p class="description"><?php esc_html_e( 'You can return to the default WordPress appearance at any time.', 'adminlume' ); ?></p>
					</td></tr>
					<tr><th scope="row"><label for="ra-chrome-background"><?php esc_html_e( 'Sidebar and top bar background', 'adminlume' ); ?></label></th><td>
						<input type="color" id="ra-chrome-background" name="preferences[chrome_background]" value="<?php echo esc_attr( $preferences['chrome_background'] ); ?>">
						<p class="description"><?php esc_html_e( 'Default: black (#000000). Text and icons adapt to light or dark backgrounds. Button colors remain independent.', 'adminlume' ); ?></p>
					</td></tr>
					<tr><th scope="row"><label for="ra-accent"><?php esc_html_e( 'Accent color', 'adminlume' ); ?></label></th><td>
						<input type="color" id="ra-accent" name="preferences[accent]" value="<?php echo esc_attr( $preferences['accent'] ); ?>">
						<p class="description"><?php esc_html_e( 'Button text contrast adjusts automatically.', 'adminlume' ); ?></p>
					</td></tr>
					<tr><th scope="row"><label for="ra-radius"><?php esc_html_e( 'Panel corner radius', 'adminlume' ); ?></label></th><td>
						<select id="ra-radius" name="preferences[radius]">
							<?php foreach ( array( 8 => _x( 'Subtle', 'panel corner radius', 'adminlume' ), 12 => _x( 'Medium', 'panel corner radius', 'adminlume' ), 16 => _x( 'Soft', 'panel corner radius', 'adminlume' ) ) as $value => $label ) : ?>
								<option value="<?php echo esc_attr( (string) $value ); ?>" <?php selected( $preferences['radius'], $value ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
					</td></tr>
				</table>
				<?php submit_button( __( 'Save preferences', 'adminlume' ) ); ?>
			</form>
			<p><?php esc_html_e( 'On your site, only your admin toolbar is restyled; visitors see no changes. No remote fonts, tracking, or frameworks. The block editor and third-party plugins keep their own controls.', 'adminlume' ); ?></p>
		</div>
		<?php
	}
}
