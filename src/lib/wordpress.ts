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

/** ACF フィールド（未公開時は API が空配列を返す） */
type WpAcf = {
	category_sortno?: string | number | boolean | null;
	sort?: string | number | boolean | null;
};

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
	acf?: WpAcf | unknown[];
};

/** WP REST API の固定ページ（必要なフィールドのみ） */
export type WpPage = {
	id: number;
	slug: string;
	link: string;
	title: {
		rendered: string;
	};
	excerpt?: {
		rendered: string;
	};
	content?: {
		rendered: string;
	};
};

/** WP REST API の投稿（必要なフィールドのみ） */
export type WpPost = {
	id: number;
	link: string;
	slug: string;
	date: string;
	modified: string;
	categories: number[];
	tags?: number[];
	author?: number;
	title: {
		rendered: string;
	};
	excerpt?: {
		rendered: string;
	};
	content?: {
		rendered: string;
	};
	acf?: WpAcf | unknown[];
};

/** WP REST API のタグ */
export type WpTag = {
	id: number;
	name: string;
	slug: string;
	link: string;
};

/** WP REST API のユーザー */
export type WpUser = {
	id: number;
	name: string;
	slug: string;
	link: string;
	avatar_urls?: Record<string, string>;
};

/** 記事詳細ページ用データ */
export type ArticleTocItem = {
	id: string;
	label: string;
};

export type ArticleTag = {
	label: string;
	href: string;
};

export type ArticleNeighbor = {
	title: string;
	href: string;
};

export type ArticleDetail = {
	title: string;
	lead: string;
	publishedAt: string;
	updatedAt: string;
	body: string;
	toc: ArticleTocItem[];
	tags: ArticleTag[];
	authorName: string;
	authorAvatar: string;
	path: string;
	lessonNumber: string;
	previousArticle: ArticleNeighbor | null;
	nextArticle: ArticleNeighbor | null;
};

/** 固定ページ表示用データ */
export type WpPageDetail = {
	title: string;
	description: string;
	body: string;
	path: string;
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

/** タグ一覧ページ用データ */
export type TagPageData = {
	title: string;
	path: string;
	articles: CategoryArticle[];
};

/** サイト内検索の索引1件 */
export type SearchIndexItem = {
	title: string;
	href: string;
	updatedAt: string;
	updatedLabel: string;
	excerpt: string;
};

/** 子カテゴリの要約（トップのコース一覧など） */
export type CategorySummary = {
	title: string;
	description: string;
	href: string;
};

/** トップ用: /learn 直下カテゴリと、その中のコース一覧 */
export type LearnCourseSection = CategorySummary & {
	courses: CategorySummary[];
};

/** トップ／記事サイドバーのアーカイブ（Programming / Server） */
export type ArchiveGroup = {
	title: string;
	children: CategorySummary[];
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

/** ISO 日付を「YYYY年M月D日」表示用に整形 */
export function formatDateJa(isoDate: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
	if (!match) return isoDate;
	return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

/** datetime 属性用に日付部分だけ取り出す */
export function toDateTimeValue(isoDate: string): string {
	return isoDate.slice(0, 10);
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

/** サイドバー「人気記事」の件数 */
const POPULAR_ARTICLE_LIMIT = 5;

/** ビルド／リクエスト内で使い回すキャッシュ */
let categoryCache: Promise<WpCategory[]> | null = null;
let postCache: Promise<WpPost[]> | null = null;
let articlePostCache: Promise<WpPost[]> | null = null;
let learnTermCache: Promise<WpCategory[]> | null = null;
let learnPostCache: Promise<WpPost[]> | null = null;
let tagCache: Promise<WpTag[]> | null = null;
let userCache: Promise<WpUser[]> | null = null;
let popularArticleCache: Promise<CategoryArticle[]> | null = null;
const pageBySlugCache = new Map<string, Promise<WpPageDetail | undefined>>();

/** 全カテゴリを取得（キャッシュあり） */
export function getWpCategories(): Promise<WpCategory[]> {
	categoryCache ??= fetchCollection<WpCategory>("categories", {
		_fields: "id,parent,slug,name,description,link,count,acf",
		acf_format: "standard",
	});
	return categoryCache;
}

/** 全投稿を取得（キャッシュあり・日付昇順） */
export function getWpPosts(): Promise<WpPost[]> {
	postCache ??= fetchCollection<WpPost>("posts", {
		_fields: "id,link,slug,title,date,modified,categories,acf",
		acf_format: "standard",
		orderby: "date",
		order: "asc",
	});
	return postCache;
}

/** 学習タクソノミー learn_cat のタームを取得（リンクは /learn/{slug}/ に正規化） */
export function getLearnTerms(): Promise<WpCategory[]> {
	learnTermCache ??= fetchCollection<WpCategory>(LEARN_TAXONOMY, {
		_fields: "id,parent,slug,name,description,link,count,acf",
		acf_format: "standard",
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
		_fields: "id,link,slug,title,date,modified,learn_cat,tags,excerpt,content,acf",
		acf_format: "standard",
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

/** ACF オブジェクトを取り出す（未公開時の空配列は無視） */
function readAcf(acf: WpCategory["acf"] | WpPost["acf"]): WpAcf {
	if (!acf || Array.isArray(acf)) return {};
	return acf;
}

/** ACF の並び番号。未設定は null */
function sortNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** 並び番号の比較（低い順。未設定は末尾） */
function compareSortNumber(a: number | null, b: number | null): number {
	const left = a ?? Number.POSITIVE_INFINITY;
	const right = b ?? Number.POSITIVE_INFINITY;
	return left - right;
}

/** 指定親の直下の子カテゴリ（category_sortno 昇順、同値は slug） */
function childrenOf(categories: WpCategory[], parentId: number): WpCategory[] {
	return categories
		.filter((category) => category.parent === parentId)
		.sort((a, b) => {
			const bySort = compareSortNumber(
				sortNumber(readAcf(a.acf).category_sortno),
				sortNumber(readAcf(b.acf).category_sortno),
			);
			if (bySort !== 0) return bySort;
			return a.slug.localeCompare(b.slug, "en");
		});
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

/**
 * 投稿配列を一覧用 Article に変換
 * - 記事 ACF sort が最優先
 * - なければカテゴリ ACF sort（defaultSort）
 * - 同値は日付昇順
 */
function articlesFromPosts(posts: WpPost[], defaultSort: number | null): CategoryArticle[] {
	return uniquePosts(posts)
		.sort((a, b) => {
			const bySort = compareSortNumber(
				sortNumber(readAcf(a.acf).sort) ?? defaultSort,
				sortNumber(readAcf(b.acf).sort) ?? defaultSort,
			);
			if (bySort !== 0) return bySort;
			const byDate = a.date.localeCompare(b.date);
			if (byDate !== 0) return byDate;
			return a.id - b.id;
		})
		.map((post) => ({
			title: wpText(post.title.rendered),
			href: toArticlePath(post.link),
			updatedAt: post.modified || post.date,
		}));
}

/**
 * カテゴリノードの記事一覧
 * - 直下に投稿があればそれを使う
 * - なければ子孫カテゴリの投稿をまとめる
 */
function articlesForNode(categories: WpCategory[], posts: WpPost[], categoryId: number): CategoryArticle[] {
	const node = categories.find((category) => category.id === categoryId);
	const defaultSort = sortNumber(readAcf(node?.acf).sort);
	const direct = postsForCategory(posts, categoryId);
	if (direct.length > 0) return articlesFromPosts(direct, defaultSort);

	const nestedIds = descendantIds(categories, categoryId).filter((id) => id !== categoryId);
	return articlesFromPosts(
		nestedIds.flatMap((id) => postsForCategory(posts, id)),
		defaultSort,
	);
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

/** トップ／記事サイドバー用: 表示対象のアーカイブグループ */
export async function getVisibleArchiveGroups(hiddenTitles: Set<string>): Promise<ArchiveGroup[]> {
	const [sbCategory, serverCategory] = await Promise.all([
		findArchiveCategory("sb"),
		findArchiveCategory("server"),
	]);
	const [sbChildren, serverChildren] = await Promise.all([
		sbCategory ? getChildSummaries(sbCategory) : Promise.resolve([]),
		serverCategory ? getChildSummaries(serverCategory) : Promise.resolve([]),
	]);

	return [
		sbCategory
			? {
					title: wpText(sbCategory.name),
					children: sbChildren.filter((child) => !hiddenTitles.has(child.title)),
				}
			: null,
		serverCategory
			? {
					title: wpText(serverCategory.name),
					children: serverChildren.filter((child) => !hiddenTitles.has(child.title)),
				}
			: null,
	].filter((group): group is ArchiveGroup => group !== null && group.children.length > 0);
}

/** トップ用: /learn 直下のカテゴリごとに、子カテゴリ（なければ記事）を並べる */
export async function getLearnCourseSections(): Promise<LearnCourseSection[]> {
	const [terms, posts] = await Promise.all([getLearnTerms(), getLearnPosts()]);

	return childrenOf(terms, 0).map((root) => {
		const childTerms = childrenOf(terms, root.id);
		const defaultSort = sortNumber(readAcf(root.acf).sort);
		const courses =
			childTerms.length > 0
				? childTerms.map(summaryFromCategory)
				: articlesFromPosts(postsForCategory(posts, root.id), defaultSort).map((article) => ({
						title: article.title,
						description: "",
						href: article.href,
					}));

		return {
			...summaryFromCategory(root),
			courses,
		};
	});
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

/** 記事詳細用の通常投稿（本文付き） */
function getWpArticlePosts(): Promise<WpPost[]> {
	articlePostCache ??= fetchCollection<WpPost>("posts", {
		_fields: "id,link,slug,title,date,modified,categories,tags,author,excerpt,content",
		orderby: "date",
		order: "asc",
	});
	return articlePostCache;
}

/** 全タグを取得（キャッシュあり） */
function getWpTags(): Promise<WpTag[]> {
	tagCache ??= fetchCollection<WpTag>("tags", {
		_fields: "id,name,slug,link",
	});
	return tagCache;
}

/** WP タグ slug は日本語がエンコードされたままのことがある */
export function decodeTagSlug(slug: string): string {
	try {
		return decodeURIComponent(slug);
	} catch {
		return slug;
	}
}

/** タグ一覧のサイト内パス */
function toTagPath(slug: string): string {
	return `/tag/${decodeTagSlug(slug)}/`;
}

/** slug からタグを探す */
export async function findWpTag(slug: string): Promise<WpTag | undefined> {
	const tags = await getWpTags();
	const target = decodeTagSlug(slug);
	return tags.find((tag) => decodeTagSlug(tag.slug) === target);
}

/** 記事が1件以上あるタグだけ返す（静的パス用） */
export async function getTaggedArchiveTags(): Promise<WpTag[]> {
	const [tags, posts] = await Promise.all([getWpTags(), getArchiveArticlePosts()]);
	return tags.filter((tag) => posts.some((post) => (post.tags ?? []).includes(tag.id)));
}

const SIDEBAR_TAG_LIMIT = 20;

/** 右カラム用: 記事が多いタグを最大20件、名前順で返す */
export async function getSidebarTags(): Promise<ArticleTag[]> {
	const [tags, posts] = await Promise.all([getWpTags(), getArchiveArticlePosts()]);
	return tags
		.map((tag) => ({
			tag,
			count: posts.filter((post) => (post.tags ?? []).includes(tag.id)).length,
		}))
		.filter((item) => item.count > 0)
		.sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return wpText(a.tag.name).localeCompare(wpText(b.tag.name), "ja");
		})
		.slice(0, SIDEBAR_TAG_LIMIT)
		.sort((a, b) => wpText(a.tag.name).localeCompare(wpText(b.tag.name), "ja"))
		.map(({ tag }) => ({
			label: wpText(tag.name),
			href: toTagPath(tag.slug),
		}));
}

/** タグに紐づく記事一覧を組み立てる */
export async function getTagPageData(tag: WpTag): Promise<TagPageData> {
	const posts = await getArchiveArticlePosts();
	const matched = posts.filter((post) => (post.tags ?? []).includes(tag.id));
	return {
		title: wpText(tag.name),
		path: toTagPath(tag.slug),
		articles: articlesFromPosts(matched, null),
	};
}

/** 検索用にタイトル・抜粋を正規化 */
function searchHaystack(item: Pick<SearchIndexItem, "title" | "excerpt">): string {
	return `${item.title}\n${item.excerpt}`.toLowerCase();
}

/** サイト内検索の索引（sb / server / learn の記事） */
export async function getSearchIndex(): Promise<SearchIndexItem[]> {
	const posts = await getArchiveArticlePosts();
	const seen = new Set<number>();

	return posts
		.filter((post) => {
			if (seen.has(post.id)) return false;
			seen.add(post.id);
			return true;
		})
		.sort((a, b) => {
			const byModified = (b.modified || b.date).localeCompare(a.modified || a.date);
			if (byModified !== 0) return byModified;
			return b.id - a.id;
		})
		.map((post) => {
			const updatedAt = post.modified || post.date;
			return {
				title: wpText(post.title.rendered),
				href: toArticlePath(post.link),
				updatedAt,
				updatedLabel: formatUpdatedAt(updatedAt),
				excerpt: post.excerpt ? wpText(post.excerpt.rendered).trim() : "",
			};
		});
}

/** 索引からキーワード（空白区切り AND）で絞り込む */
export function filterSearchIndex(index: SearchIndexItem[], query: string): SearchIndexItem[] {
	const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return [];

	return index.filter((item) => {
		const haystack = searchHaystack(item);
		return tokens.every((token) => haystack.includes(token));
	});
}

/** 固定ページをスラッグで1件取得（キャッシュあり） */
export function getWpPageBySlug(slug: string): Promise<WpPageDetail | undefined> {
	const cached = pageBySlugCache.get(slug);
	if (cached) return cached;

	const pending = fetchWpPageBySlug(slug);
	pageBySlugCache.set(slug, pending);
	return pending;
}

async function fetchWpPageBySlug(slug: string): Promise<WpPageDetail | undefined> {
	const url = new URL(`${getApiUrl()}/wp/v2/pages`);
	url.searchParams.set("slug", slug);
	url.searchParams.set("per_page", "1");
	url.searchParams.set("_fields", "id,slug,link,title,excerpt,content");

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`WordPress API error: ${response.status} ${url.pathname}`);
	}

	const pages = (await response.json()) as WpPage[];
	const page = pages[0];
	if (!page) return undefined;

	const { html } = applyHeadingIds(stripUnsafeHtml(page.content?.rendered ?? ""));
	const description = wpText(page.excerpt?.rendered ?? "")
		.replace(/\[&hellip;\]/g, "")
		.replace(/\s*[.…]+$/u, "")
		.trim();

	return {
		title: wpText(page.title.rendered),
		description,
		body: html,
		path: toArticlePath(page.link),
	};
}

/** 全ユーザーを取得（権限で失敗したら空） */
function getWpUsers(): Promise<WpUser[]> {
	userCache ??= fetchCollection<WpUser>("users", {
		_fields: "id,name,slug,link,avatar_urls",
	}).catch(() => []);
	return userCache;
}

/** 本文の script 等を除く（WP は信頼できるが最低限の除去） */
function stripUnsafeHtml(html: string): string {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, "")
		.replace(/<style\b[\s\S]*?<\/style>/gi, "")
		.replace(/\son\w+="[^"]*"/gi, "")
		.replace(/\son\w+='[^']*'/gi, "");
}

/** 本文 h2 に id を補い、目次項目を作る */
export function applyHeadingIds(html: string): { html: string; toc: ArticleTocItem[] } {
	const toc: ArticleTocItem[] = [];
	let headingIndex = 0;
	const nextHtml = html.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs: string, inner: string) => {
		const label = wpText(inner).trim();
		if (!label) return full;
		headingIndex += 1;
		const existing = /\bid\s*=\s*(["'])([^"']+)\1/i.exec(attrs);
		const id = existing?.[2] || `section-${headingIndex}`;
		toc.push({ id, label });
		if (existing) return full;
		const trimmed = attrs.trim();
		const attrStr = trimmed ? ` ${trimmed}` : "";
		return `<h2 id="${id}"${attrStr}>${inner}</h2>`;
	});
	return { html: nextHtml, toc };
}

/** sb / server の通常投稿 + learn CPT */
export async function getArchiveArticlePosts(): Promise<WpPost[]> {
	const [posts, learnPosts] = await Promise.all([getWpArticlePosts(), getLearnPosts()]);
	const archivePosts = posts.filter((post) => {
		const path = toSitePath(post.link);
		return path.startsWith("/sb/") || path.startsWith("/server/");
	});
	return [...archivePosts, ...learnPosts];
}

/**
 * 記事 permalink から Astro ルート用パラメータへ変換
 * 例: /sb/javascript/foo.html → { section: "sb", slug: "javascript/foo" }
 */
export function toPostRouteParams(post: WpPost): { section: ArchiveRootSlug; slug: string } | null {
	const segments = pathSegments(post.link);
	const section = segments[0];
	if (!section || !isArchiveRootSlug(section)) return null;
	if (segments.length < 2) return null;
	const rest = segments.slice(1);
	const last = rest.at(-1);
	if (last) rest[rest.length - 1] = last.replace(/\.html$/i, "");
	return { section, slug: rest.join("/") };
}

/** 記事のサイト内パス（.html は外し、末尾スラッシュ付き） */
export function toArticlePath(link: string): string {
	const path = toSitePath(link).replace(/\.html\/?$/i, "/");
	return path.endsWith("/") ? path : `${path}/`;
}

/** このサイトの記事パスかどうか（sb / server / learn） */
function isArchiveArticleLink(link: string): boolean {
	const path = toSitePath(link);
	return path.startsWith("/sb/") || path.startsWith("/server/") || path.startsWith("/learn/");
}

/**
 * WordPress Popular Posts の REST から人気記事を取得
 * GET /wordpress-popular-posts/v1/popular-posts
 */
async function fetchPopularArticles(): Promise<CategoryArticle[]> {
	const url = new URL(`${getApiUrl()}/wordpress-popular-posts/v1/popular-posts`);
	url.searchParams.set("range", "all");
	url.searchParams.set("limit", String(POPULAR_ARTICLE_LIMIT));
	url.searchParams.set("post_type", `post,${LEARN_POST_TYPE}`);
	url.searchParams.set("_fields", "id,link,title,date,modified");

	try {
		const response = await fetch(url);
		if (!response.ok) return [];

		const data = (await response.json()) as WpPost[];
		if (!Array.isArray(data)) return [];

		return data
			.filter((post) => post.link && isArchiveArticleLink(post.link))
			.slice(0, POPULAR_ARTICLE_LIMIT)
			.map((post) => ({
				title: wpText(post.title.rendered),
				href: toArticlePath(post.link),
				updatedAt: post.modified || post.date,
			}));
	} catch {
		return [];
	}
}

/** サイドバー用の人気記事（キャッシュあり） */
export function getPopularArticles(): Promise<CategoryArticle[]> {
	popularArticleCache ??= fetchPopularArticles();
	return popularArticleCache;
}

/** 記事パスに最も近い所属カテゴリ（タクソノミーを混ぜない） */
function findPostCategory(post: WpPost, categories: WpCategory[]): WpCategory | undefined {
	const isLearnPost = normalizePath(toArticlePath(post.link)).startsWith("learn/");
	const pool = categories.filter((category) => (isLearnPost ? isLearnTaxonomy(category) : !isLearnTaxonomy(category)));
	const assigned = pool.filter((category) => post.categories.includes(category.id));
	if (assigned.length === 0) return undefined;

	const articlePath = normalizePath(toArticlePath(post.link));
	const byPath = assigned
		.filter((category) => {
			const path = normalizePath(toSitePath(category.link));
			return path.length > 0 && (articlePath === path || articlePath.startsWith(`${path}/`));
		})
		.sort((a, b) => normalizePath(toSitePath(b.link)).length - normalizePath(toSitePath(a.link)).length);

	return byPath[0] ?? assigned[0];
}

function articlesInPostCategory(post: WpPost, categories: WpCategory[], posts: WpPost[]): CategoryArticle[] {
	const category = findPostCategory(post, categories);
	if (!category) return [];
	return articlesForNode(categories, posts, category.id);
}

/** 所属カテゴリ内の記事表示順を 01 形式で返す */
function lessonNumberForPost(post: WpPost, categories: WpCategory[], posts: WpPost[]): string {
	const articles = articlesInPostCategory(post, categories, posts);
	const href = toArticlePath(post.link);
	const index = articles.findIndex((item) => item.href === href);
	return String(index >= 0 ? index + 1 : 1).padStart(2, "0");
}

function neighborFromArticle(article: CategoryArticle | undefined): ArticleNeighbor | null {
	if (!article) return null;
	return { title: article.title, href: article.href };
}

/** 同じカテゴリ内の前後記事 */
function adjacentArticles(
	post: WpPost,
	categories: WpCategory[],
	posts: WpPost[],
): { previous: ArticleNeighbor | null; next: ArticleNeighbor | null } {
	const articles = articlesInPostCategory(post, categories, posts);
	const href = toArticlePath(post.link);
	const index = articles.findIndex((item) => item.href === href);
	if (index < 0) return { previous: null, next: null };
	return {
		previous: neighborFromArticle(articles[index - 1]),
		next: neighborFromArticle(articles[index + 1]),
	};
}

function buildArticleDetail(
	post: WpPost,
	tags: WpTag[],
	users: WpUser[],
	categories: WpCategory[],
	posts: WpPost[],
): ArticleDetail {
	const title = wpText(post.title.rendered);
	const lead = wpText(post.excerpt?.rendered ?? "")
		.replace(/\s*[.…]+$/u, "")
		.trim();
	const { html, toc } = applyHeadingIds(stripUnsafeHtml(post.content?.rendered ?? ""));
	const tagItems = (post.tags ?? [])
		.map((id) => tags.find((tag) => tag.id === id))
		.filter((tag): tag is WpTag => Boolean(tag))
		.map((tag) => ({
			label: wpText(tag.name),
			href: toTagPath(tag.slug),
		}));
	const user = post.author ? users.find((item) => item.id === post.author) : undefined;
	const lessonNumber = lessonNumberForPost(post, categories, posts);
	const { previous, next } = adjacentArticles(post, categories, posts);

	return {
		title,
		lead,
		publishedAt: post.date,
		updatedAt: post.modified || post.date,
		body: html,
		toc,
		tags: tagItems,
		authorName: user?.name ?? "",
		authorAvatar: user?.avatar_urls?.["96"] ?? user?.avatar_urls?.["48"] ?? "",
		path: toArticlePath(post.link),
		lessonNumber,
		previousArticle: previous,
		nextArticle: next,
	};
}

/** 記事詳細ページ用データを組み立てる */
export async function getArticleDetail(post: WpPost): Promise<ArticleDetail> {
	const isLearnPost = normalizePath(toArticlePath(post.link)).startsWith("learn/");
	const [tags, users, categories, posts] = await Promise.all([
		getWpTags(),
		getWpUsers(),
		isLearnPost ? getLearnTerms() : getWpCategories(),
		isLearnPost ? getLearnPosts() : getWpPosts(),
	]);
	return buildArticleDetail(post, tags, users, categories, posts);
}

/** section + slug からアーカイブ記事を探す */
export async function findArchivePost(section: string, slug?: string): Promise<WpPost | undefined> {
	if (!isArchiveRootSlug(section) || !slug) return undefined;
	const posts = await getArchiveArticlePosts();
	const target = normalizePath(`${section}/${slug}`).replace(/\.html$/i, "");
	return posts.find((post) => normalizePath(toArticlePath(post.link)) === target);
}
