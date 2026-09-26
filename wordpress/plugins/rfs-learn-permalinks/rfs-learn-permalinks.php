<?php
/**
 * Plugin Name: RFS Learn Permalinks
 * Description: learn 記事のパーマリンクを /learn/{learn_cat}/{postname}/ にする（Headless / REST link 用）
 * Version: 1.0.0
 */

declare(strict_types=1);

const RFS_LEARN_POST_TYPE = 'learn';
const RFS_LEARN_TAXONOMY = 'learn_cat';

/**
 * CPT の rewrite を learn/%learn_cat% に寄せる（既存の register_post_type を上書き）
 */
add_filter('register_post_type_args', static function (array $args, string $post_type): array {
	if ($post_type !== RFS_LEARN_POST_TYPE) {
		return $args;
	}
	$args['rewrite'] = [
		'slug' => 'learn/%' . RFS_LEARN_TAXONOMY . '%',
		'with_front' => false,
	];
	$args['has_archive'] = false;
	return $args;
}, 20, 2);

/**
 * %learn_cat% を実タームスラッグに置換し、/learn/{cat}/{postname}/ を返す
 */
add_filter('post_type_link', static function (string $post_link, WP_Post $post): string {
	if ($post->post_type !== RFS_LEARN_POST_TYPE) {
		return $post_link;
	}

	$article_slug = $post->post_name;
	$term = rfs_learn_pick_deepest_term((int) $post->ID);

	$path = $term
		? 'learn/' . $term->slug . '/' . $article_slug
		: 'learn/' . $article_slug;

	return home_url(user_trailingslashit($path));
}, 10, 2);

/**
 * /learn/{category}/{postname}/ を learn 投稿として解決
 */
add_action('init', static function (): void {
	add_rewrite_rule(
		'^learn/([^/]+)/([^/]+)/?$',
		'index.php?post_type=' . RFS_LEARN_POST_TYPE . '&name=$matches[2]',
		'top'
	);
}, 20);

/**
 * 所属 learn_cat のうち、階層が最も深いタームを返す
 */
function rfs_learn_pick_deepest_term(int $post_id): ?WP_Term {
	$terms = get_the_terms($post_id, RFS_LEARN_TAXONOMY);
	if (empty($terms) || is_wp_error($terms)) {
		return null;
	}

	$depth = static function (WP_Term $term) use (&$depth): int {
		if ((int) $term->parent === 0) {
			return 0;
		}
		$parent = get_term((int) $term->parent, RFS_LEARN_TAXONOMY);
		if (!$parent || is_wp_error($parent)) {
			return 0;
		}
		return 1 + $depth($parent);
	};

	usort($terms, static function (WP_Term $a, WP_Term $b) use ($depth): int {
		$by_depth = $depth($b) <=> $depth($a);
		if ($by_depth !== 0) {
			return $by_depth;
		}
		return strcmp($a->slug, $b->slug);
	});

	return $terms[0] ?? null;
}

register_activation_hook(__FILE__, static function (): void {
	add_rewrite_rule(
		'^learn/([^/]+)/([^/]+)/?$',
		'index.php?post_type=' . RFS_LEARN_POST_TYPE . '&name=$matches[2]',
		'top'
	);
	flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, static function (): void {
	flush_rewrite_rules();
});
