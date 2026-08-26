/**
 * Headless WordPress API 連携
 * - 読み取り専用（カテゴリ／投稿の取得と整形のみ）
 * - WP 側への作成・更新・削除は行わない
 * - 要: .env の WORDPRESS_API_URL（例: https://example.com/wp-json）
 */

/** アーカイブとして扱うルートカテゴリの slug（親なし） */
const ARCHIVE_ROOT_SLUGS = ["sb", "server", "learn"] as const;

/** 学習セクションの CPT / タクソノミー（REST base） */
const LEARN_POST_TYPE = "learn";
const LEARN_TAXONOMY = "learn_cat";
const LEARN_ROOT_ID = -1;

export type ArchiveRootSlug = (typeof ARCHIVE_ROOT_SLUGS)[number];

/** WP REST API のカテゴリ／タクソノミーターム（必要なフィールドのみ） */
export type WpCategory = {
	id: number;
	parent: number;
	slug: string;
	name: string;
	description: string;
	link: string;
	count: number;
	taxonomy?: "category" | "learn_cat";
};

/** WP REST API の投稿（必要なフィールドのみ） */
export type WpPost = {
	id: number;
	link: string;
	slug: string;
	date: string;
	modified: string;
	categories: number[];
	title: {
		rendered: string;
	};
};

type WpLearnPostResponse = Omit<WpPost, "categories"> & {
	learn_cat?: number[];
};

/** 学習セクションの仮想ルート（標準カテゴリ `learn` は存在しない） */
const LEARN_ROOT: WpCategory = {
	id: LEARN_ROOT_ID,
	parent: 0,
	slug: "learn",
	name: "開発と学習",
	description: "これから学ぶ新しいコンテンツから始めよう",
	link: "/learn/",
	count: 0,
	taxonomy: "learn_cat",
};

/** 一覧表示用の記事1件 */
export type CategoryArticle = {
	title: string;
	href: string;
	updatedAt: string;
};

/** カテゴリページ内の章（子カテゴリ単位） */
export type CategoryChapter = {
	title: string;
	articles: CategoryArticle[];
};

/** カテゴリ詳細ページ用データ */
export type CategoryPageData = {
	title: string;
	description: string;
	path: string;
	chapters: CategoryChapter[];
};

/** 子カテゴリの要約（トップのコース一覧など） */
export type CategorySummary = {
	title: string;
	description: string;
	href: string;
};

/** .env の WORDPRESS_API_URL を返す（末尾スラッシュは除去） */
function getApiUrl(): string {
	const value = import.meta.env.WORDPRESS_API_URL;
	if (!value) {
		throw new Error("WORDPRESS_API_URL が設定されていません。.env を確認してください。");
	}
	return value.replace(/\/$/, "");
}

/** アーカイブルートの slug かどうか */
export function isArchiveRootSlug(value: string): value is ArchiveRootSlug {
	return (ARCHIVE_ROOT_SLUGS as readonly string[]).includes(value);
}

/** WP の絶対 URL からサイト内パス（pathname + search）を取り出す */
export function toSitePath(link: string): string {
	try {
		const url = new URL(link);
		return `${url.pathname}${url.search}` || "/";
	} catch {
		return link;
	}
}

/** WP の HTML エンティティ／タグをプレーンテキストに変換 */
export function wpText(value: string): string {
	return value
		.replace(/<[^>]*>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

/** ISO 日付を YYYY.MM.DD 表示用に整形 */
export function formatUpdatedAt(isoDate: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
	if (!match) return isoDate;
	return `${match[1]}.${match[2]}.${match[3]}`;
}

/**
 * WP コレクションを全ページ取得（per_page=100 でページング）
 * @param resource 例: "categories" / "posts"
 */
async function fetchCollection<T>(resource: string, searchParams: Record<string, string> = {}): Promise<T[]> {
	const items: T[] = [];
	let page = 1;

	while (true) {
		const url = new URL(`${getApiUrl()}/wp/v2/${resource}`);
		url.searchParams.set("per_page", "100");
		url.searchParams.set("page", String(page));
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.set(key, value);
		}

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`WordPress API error: ${response.status} ${url.pathname}`);
		}

		const data = (await response.json()) as T[];
		items.push(...data);

		const totalPages = Number(response.headers.get("X-WP-TotalPages") || 1);
		if (page >= totalPages) break;
		page += 1;
	}

	return items;
}

/** ビルド／リクエスト内で使い回すキャッシュ */
let categoryCache: Promise<WpCategory[]> | null = null;
let postCache: Promise<WpPost[]> | null = null;
let learnTermCache: Promise<WpCategory[]> | null = null;
let learnPostCache: Promise<WpPost[]> | null = null;

/** 全カテゴリを取得（キャッシュあり） */
export function getWpCategories(): Promise<WpCategory[]> {
	categoryCache ??= fetchCollection<WpCategory>("categories", {
		_fields: "id,parent,slug,name,description,link,count",
	});
	return categoryCache;
}

/** 全投稿を取得（キャッシュあり・日付昇順） */
export function getWpPosts(): Promise<WpPost[]> {
	postCache ??= fetchCollection<WpPost>("posts", {
		_fields: "id,link,slug,title,date,modified,categories",
		orderby: "date",
		order: "asc",
	});
	return postCache;
}

/** 学習タクソノミー learn_cat のタームを取得（リンクは /learn/{slug}/ に正規化） */
export function getLearnTerms(): Promise<WpCategory[]> {
	learnTermCache ??= fetchCollection<WpCategory>(LEARN_TAXONOMY, {
		_fields: "id,parent,slug,name,description,link,count",
	}).then((terms) =>
		terms.map((term) => ({
			...term,
			link: `/learn/${term.slug}/`,
			taxonomy: "learn_cat" as const,
		})),
	);
	return learnTermCache;
}

/** 投稿タイプ learn を取得（learn_cat を categories として扱う） */
export function getLearnPosts(): Promise<WpPost[]> {
	learnPostCache ??= fetchCollection<WpLearnPostResponse>(LEARN_POST_TYPE, {
		_fields: "id,link,slug,title,date,modified,learn_cat",
		orderby: "date",
		order: "asc",
	}).then((posts) =>
		posts.map((post) => ({
			...post,
			categories: post.learn_cat ?? [],
		})),
	);
	return learnPostCache;
}

function isLearnTaxonomy(category: WpCategory): boolean {
	return category.taxonomy === "learn_cat";
}

function summaryFromCategory(category: WpCategory): CategorySummary {
	const path = toSitePath(category.link);
	return {
		title: wpText(category.name),
		description: wpText(category.description),
		href: path.endsWith("/") ? path : `${path}/`,
	};
}

/** 指定親の直下の子カテゴリ（slug 昇順） */
function childrenOf(categories: WpCategory[], parentId: number): WpCategory[] {
	return categories
		.filter((category) => category.parent === parentId)
		.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
}

/** 自分＋子孫カテゴリ ID を再帰で集める */
function descendantIds(categories: WpCategory[], parentId: number): number[] {
	const children = childrenOf(categories, parentId);
	return [parentId, ...children.flatMap((child) => descendantIds(categories, child.id))];
}

/** 指定カテゴリ ID が付いた投稿のみ */
function postsForCategory(posts: WpPost[], categoryId: number): WpPost[] {
	return posts.filter((post) => post.categories.includes(categoryId));
}

/** 同一投稿の重複を除去 */
function uniquePosts(posts: WpPost[]): WpPost[] {
	const seen = new Set<number>();
	return posts.filter((post) => {
		if (seen.has(post.id)) return false;
		seen.add(post.id);
		return true;
	});
}

/** 投稿配列を一覧用 Article に変換（日付昇順） */
function articlesFromPosts(posts: WpPost[]): CategoryArticle[] {
	return uniquePosts(posts)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((post) => ({
			title: wpText(post.title.rendered),
			href: toSitePath(post.link),
			updatedAt: post.modified || post.date,
		}));
}

/**
 * カテゴリノードの記事一覧
 * - 直下に投稿があればそれを使う
 * - なければ子孫カテゴリの投稿をまとめる
 */
function articlesForNode(categories: WpCategory[], posts: WpPost[], categoryId: number): CategoryArticle[] {
	const direct = postsForCategory(posts, categoryId);
	if (direct.length > 0) return articlesFromPosts(direct);

	const nestedIds = descendantIds(categories, categoryId).filter((id) => id !== categoryId);
	return articlesFromPosts(nestedIds.flatMap((id) => postsForCategory(posts, id)));
}

/** WP link からパスセグメント配列を取得（デコード済み） */
function pathSegments(link: string): string[] {
	return toSitePath(link)
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			try {
				return decodeURIComponent(segment);
			} catch {
				return segment;
			}
		});
}

/** 比較用にパスを正規化（先頭末尾スラッシュなし・デコード済み） */
function normalizePath(path: string): string {
	return path
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			try {
				return decodeURIComponent(segment);
			} catch {
				return segment;
			}
		})
		.join("/");
}

/**
 * アーカイブルート（sb / server）の子孫カテゴリと、learn_cat タームを返す
 * サイトの動的ルート対象を絞り込む
 */
export async function getArchiveCategories(): Promise<WpCategory[]> {
	const [categories, learnTerms] = await Promise.all([getWpCategories(), getLearnTerms()]);
	const roots = categories.filter((category) => category.parent === 0 && isArchiveRootSlug(category.slug));
	const rootIds = new Set(roots.map((root) => root.id));
	const archiveIds = new Set(rootIds);

	// 親がアーカイブ配下なら子も順に取り込む
	let added = true;
	while (added) {
		added = false;
		for (const category of categories) {
			if (archiveIds.has(category.id)) continue;
			if (archiveIds.has(category.parent)) {
				archiveIds.add(category.id);
				added = true;
			}
		}
	}

	return [...categories.filter((category) => archiveIds.has(category.id)), ...learnTerms];
}

/**
 * カテゴリ link から Astro ルート用パラメータへ変換
 * 例: /learn/html/ → { section: "learn", slug: "html" }
 */
export function toRouteParams(category: WpCategory): { section: ArchiveRootSlug; slug?: string } | null {
	const segments = pathSegments(category.link);
	const section = segments[0];
	if (!section || !isArchiveRootSlug(section)) return null;
	if (segments.length === 1) return { section };
	return { section, slug: segments.slice(1).join("/") };
}

/**
 * カテゴリ詳細ページ用データを組み立てる
 * - 子カテゴリがあれば章ごとに記事を並べる
 * - なければ「記事」1章にまとめる
 */
export async function getCategoryPageData(category: WpCategory): Promise<CategoryPageData> {
	const [categories, posts] = isLearnTaxonomy(category)
		? await Promise.all([getLearnTerms(), getLearnPosts()])
		: await Promise.all([getWpCategories(), getWpPosts()]);
	const children = childrenOf(categories, category.id);

	const chapters =
		children.length > 0
			? children
					.map((child) => ({
						title: wpText(child.name),
						articles: articlesForNode(categories, posts, child.id),
					}))
					.filter((chapter) => chapter.articles.length > 0)
			: [
					{
						title: "記事",
						articles: articlesForNode(categories, posts, category.id),
					},
				].filter((chapter) => chapter.articles.length > 0);

	return {
		title: wpText(category.name),
		description: wpText(category.description),
		path: toSitePath(category.link),
		chapters,
	};
}

/** 直下の子カテゴリを要約リストにする */
export async function getChildSummaries(category: WpCategory): Promise<CategorySummary[]> {
	if (isLearnTaxonomy(category)) {
		const terms = await getLearnTerms();
		const parentId = category.id === LEARN_ROOT_ID ? 0 : category.id;
		return childrenOf(terms, parentId).map(summaryFromCategory);
	}

	const categories = await getWpCategories();
	return childrenOf(categories, category.id).map(summaryFromCategory);
}

/** トップ用: タクソノミー learn_cat のルートターム一覧 */
export async function getLearnCourses(): Promise<CategorySummary[]> {
	return getChildSummaries(LEARN_ROOT);
}

/**
 * section（と任意の slug）からアーカイブカテゴリを探す
 * 例: findArchiveCategory("learn", "html")
 */
export async function findArchiveCategory(section: string, slug?: string): Promise<WpCategory | undefined> {
	if (!isArchiveRootSlug(section)) return undefined;

	if (section === "learn") {
		if (!slug) return LEARN_ROOT;
		const terms = await getLearnTerms();
		const target = `${section}/${slug}`;
		return terms.find((term) => normalizePath(toSitePath(term.link)) === target);
	}

	const categories = await getArchiveCategories();
	const target = slug ? `${section}/${slug}` : section;

	return categories.find((category) => {
		const path = normalizePath(toSitePath(category.link));
		return path === target;
	});
}
