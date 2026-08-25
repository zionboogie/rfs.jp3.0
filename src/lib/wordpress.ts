const ARCHIVE_ROOT_SLUGS = ["sb", "server", "lern"] as const;

export type ArchiveRootSlug = (typeof ARCHIVE_ROOT_SLUGS)[number];

export type WpCategory = {
	id: number;
	parent: number;
	slug: string;
	name: string;
	description: string;
	link: string;
	count: number;
};

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

export type CategoryArticle = {
	title: string;
	href: string;
	updatedAt: string;
};

export type CategoryChapter = {
	title: string;
	articles: CategoryArticle[];
};

export type CategoryPageData = {
	title: string;
	description: string;
	path: string;
	chapters: CategoryChapter[];
};

export type CategorySummary = {
	title: string;
	description: string;
	href: string;
};

function getApiUrl(): string {
	const value = import.meta.env.WORDPRESS_API_URL;
	if (!value) {
		throw new Error("WORDPRESS_API_URL が設定されていません。.env を確認してください。");
	}
	return value.replace(/\/$/, "");
}

export function isArchiveRootSlug(value: string): value is ArchiveRootSlug {
	return (ARCHIVE_ROOT_SLUGS as readonly string[]).includes(value);
}

export function toSitePath(link: string): string {
	try {
		const url = new URL(link);
		return `${url.pathname}${url.search}` || "/";
	} catch {
		return link;
	}
}

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

export function formatUpdatedAt(isoDate: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
	if (!match) return isoDate;
	return `${match[1]}.${match[2]}.${match[3]}`;
}

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

let categoryCache: Promise<WpCategory[]> | null = null;
let postCache: Promise<WpPost[]> | null = null;

export function getWpCategories(): Promise<WpCategory[]> {
	categoryCache ??= fetchCollection<WpCategory>("categories", {
		_fields: "id,parent,slug,name,description,link,count",
	});
	return categoryCache;
}

export function getWpPosts(): Promise<WpPost[]> {
	postCache ??= fetchCollection<WpPost>("posts", {
		_fields: "id,link,slug,title,date,modified,categories",
		orderby: "date",
		order: "asc",
	});
	return postCache;
}

function childrenOf(categories: WpCategory[], parentId: number): WpCategory[] {
	return categories
		.filter((category) => category.parent === parentId)
		.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
}

function descendantIds(categories: WpCategory[], parentId: number): number[] {
	const children = childrenOf(categories, parentId);
	return [parentId, ...children.flatMap((child) => descendantIds(categories, child.id))];
}

function postsForCategory(posts: WpPost[], categoryId: number): WpPost[] {
	return posts.filter((post) => post.categories.includes(categoryId));
}

function uniquePosts(posts: WpPost[]): WpPost[] {
	const seen = new Set<number>();
	return posts.filter((post) => {
		if (seen.has(post.id)) return false;
		seen.add(post.id);
		return true;
	});
}

function articlesFromPosts(posts: WpPost[]): CategoryArticle[] {
	return uniquePosts(posts)
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((post) => ({
			title: wpText(post.title.rendered),
			href: toSitePath(post.link),
			updatedAt: post.modified || post.date,
		}));
}

function articlesForNode(categories: WpCategory[], posts: WpPost[], categoryId: number): CategoryArticle[] {
	const direct = postsForCategory(posts, categoryId);
	if (direct.length > 0) return articlesFromPosts(direct);

	const nestedIds = descendantIds(categories, categoryId).filter((id) => id !== categoryId);
	return articlesFromPosts(nestedIds.flatMap((id) => postsForCategory(posts, id)));
}

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

export async function getArchiveCategories(): Promise<WpCategory[]> {
	const categories = await getWpCategories();
	const roots = categories.filter((category) => category.parent === 0 && isArchiveRootSlug(category.slug));
	const rootIds = new Set(roots.map((root) => root.id));
	const archiveIds = new Set(rootIds);

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

	return categories.filter((category) => archiveIds.has(category.id));
}

export function toRouteParams(category: WpCategory): { section: ArchiveRootSlug; slug?: string } | null {
	const segments = pathSegments(category.link);
	const section = segments[0];
	if (!section || !isArchiveRootSlug(section)) return null;
	if (segments.length === 1) return { section };
	return { section, slug: segments.slice(1).join("/") };
}

export async function getCategoryPageData(category: WpCategory): Promise<CategoryPageData> {
	const [categories, posts] = await Promise.all([getWpCategories(), getWpPosts()]);
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

export async function getChildSummaries(category: WpCategory): Promise<CategorySummary[]> {
	const categories = await getWpCategories();
	return childrenOf(categories, category.id).map((child) => ({
		title: wpText(child.name),
		description: wpText(child.description),
		href: toSitePath(child.link).endsWith("/") ? toSitePath(child.link) : `${toSitePath(child.link)}/`,
	}));
}

export async function getLernCourses(): Promise<CategorySummary[]> {
	const categories = await getWpCategories();
	const lern = categories.find((category) => category.parent === 0 && category.slug === "lern");
	if (!lern) return [];
	return getChildSummaries(lern);
}

export async function findArchiveCategory(section: string, slug?: string): Promise<WpCategory | undefined> {
	if (!isArchiveRootSlug(section)) return undefined;
	const categories = await getArchiveCategories();
	const target = slug ? `${section}/${slug}` : section;

	return categories.find((category) => {
		const path = normalizePath(toSitePath(category.link));
		return path === target;
	});
}
