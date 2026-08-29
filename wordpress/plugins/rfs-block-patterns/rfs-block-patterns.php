<?php
/**
 * Plugin Name: RFS Block Patterns
 * Description: 記事本文用のブロックパターン（コラム・ポラロイド・中央イラスト・AIに聞こう）
 * Version: 1.0.0
 */

add_action('init', static function () {
	register_block_pattern_category('rfs', [
		'label' => 'RFS.jp',
	]);

	register_block_pattern('rfs/column', [
		'title'       => 'コラム',
		'description' => '段落のあいだに置くコラム。プロフィール画像は CSS で表示されます。',
		'categories'  => ['rfs'],
		'content'     => '<!-- wp:html -->
<div class="column">
<p>ここにコラムのテキストを書きます。</p>
</div>
<!-- /wp:html -->',
	]);

	register_block_pattern('rfs/polaroid', [
		'title'       => 'ポラロイド',
		'description' => 'キャプション付きのポラロイド風画像。',
		'categories'  => ['rfs'],
		'content'     => '<!-- wp:image {"className":"polaroid"} -->
<figure class="wp-block-image polaroid"><img alt=""/><figcaption class="wp-element-caption">キャプション</figcaption></figure>
<!-- /wp:image -->',
	]);

	register_block_pattern('rfs/illust', [
		'title'       => '中央イラスト',
		'description' => '中央揃えのイラスト。公開側ではスクロールでフェードインします。',
		'categories'  => ['rfs'],
		'content'     => '<!-- wp:image {"className":"illust"} -->
<figure class="wp-block-image illust"><img alt=""/></figure>
<!-- /wp:image -->',
	]);

	register_block_pattern('rfs/ask', [
		'title'       => 'AIに聞こう',
		'description' => '質問文をコピーするボックス。質問は空のまま挿入されます。',
		'categories'  => ['rfs'],
		'content'     => '<!-- wp:html -->
<section class="article-ask" aria-label="AIに聞こう">
<div class="article-ask__item">
<p class="article-ask__heading">AIに聞こう</p>
<p class="article-ask__text">＊＊＊</p>
<div class="article-ask__copy-wrap">
<button class="article-ask__copy" type="button">コピー</button>
<dialog class="article-ask__popup" aria-label="コピー完了">
<p class="article-ask__popup-text">コピーしたよ、お使いのAIに訊いてみて。GeminiはCtrl＋Jだよ。</p>
</dialog>
</div>
</div>
</section>
<!-- /wp:html -->',
	]);
});
