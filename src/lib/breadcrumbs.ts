import { navMenus } from "../data/courses";
import {
	findArchiveCategory,
	findArchivePost,
	findWpTag,
	getWpPageBySlug,
	toArticlePath,
	getLearnTerms,
	getWpCategories,
	isArchiveRootSlug,
	toSitePath,
	wpText,
	type WpCategory,
} from "./wordpress";

export type BreadcrumbItem = {
	href: string;
	label: string;
	current?: boolean;
};

function withTrailingSlash(path: string): string {
	if (path === "/") return "/";
	return path.endsWith("/") ? path : `${path}/`;
}

function hrefFromCategory(category: WpCategory): string {
	return withTrailingSlash(toSitePath(category.link));
}

function sectionItem(section: string): BreadcrumbItem {
	const menu = navMenus.find((item) => item.id === section);
	if (menu) {
		return {
			href: menu.href,
			label: menu.label,
		};
	}

	const fallbackLabel =
		section === "learn" ? "開発と学習" : section === "sb" ? "Programming" : section === "server" ? "Server" : section;

	return {
		href: `/${section}/`,
		label: fallbackLabel,
	};
}

function trailFromParentMap(current: WpCategory, pool: WpCategory[]): WpCategory[] {
	const byId = new Map(pool.map((category) => [category.id, category]));
	const chain: WpCategory[] = [];
	let node: WpCategory | undefined = current;
	const seen = new Set<number>();

	while (node && !seen.has(node.id)) {
		seen.add(node.id);
		chain.unshift(node);
		if (!node.parent) break;
		node = byId.get(node.parent);
	}

	return chain;
}

async function archiveTrail(section: string, current: WpCategory | undefined): Promise<BreadcrumbItem[]> {
	if (!current) return [sectionItem(section)];

	if (section === "learn") {
		if (current.slug === "learn") return [sectionItem(section)];
		const terms = await getLearnTerms();
		const chain = trailFromParentMap(current, terms);
		return [sectionItem(section), ...chain.map((term) => ({ href: hrefFromCategory(term), label: wpText(term.name) }))];
	}

	const categories = await getWpCategories();
	const chain = trailFromParentMap(current, categories);
	return chain.map((category) => ({
		href: hrefFromCategory(category),
		label: wpText(category.name),
	}));
}

/** トップ以外のパスからパンくず項目を組み立てる */
export async function getBreadcrumbItems(pathname: string): Promise<BreadcrumbItem[]> {
	const segments = pathname.split("/").filter(Boolean).map((segment) => {
		try {
			return decodeURIComponent(segment);
		} catch {
			return segment;
		}
	});
	if (segments.length === 0) return [];

	const home: BreadcrumbItem = { href: "/", label: "トップページ" };
	const section = segments[0];

	if (section === "archive" && segments.length === 1) {
		const menu = navMenus.find((item) => item.id === "archive");
		return [
			home,
			{
				href: menu?.href ?? "/archive/",
				label: menu?.label ?? "アーカイブ",
				current: true,
			},
		];
	}

	if (section === "author" && segments.length === 1) {
		const page = await getWpPageBySlug("author");
		return [
			home,
			{
				href: page?.path ?? "/author/",
				label: page?.title ?? "author",
				current: true,
			},
		];
	}

	if (section === "search") {
		return [
			home,
			{
				href: "/search/",
				label: "検索",
				current: true,
			},
		];
	}

	if (section === "tag") {
		const slug = segments[1];
		if (!slug) {
			return [{ ...home, current: true }];
		}
		const tag = await findWpTag(slug);
		return [
			home,
			{
				href: withTrailingSlash(`/${segments.slice(0, 2).join("/")}`),
				label: tag ? wpText(tag.name) : slug,
				current: true,
			},
		];
	}

	if (!section || !isArchiveRootSlug(section)) {
		const items: BreadcrumbItem[] = [
			home,
			...segments.map((segment, index) => ({
				href: withTrailingSlash(`/${segments.slice(0, index + 1).join("/")}`),
				label: segment,
			})),
		];
		const last = items.at(-1);
		if (last) last.current = true;
		return items;
	}

	const slug = segments.slice(1).join("/") || undefined;
	const current = await findArchiveCategory(section, slug);
	if (current) {
		const items: BreadcrumbItem[] = [home, ...(await archiveTrail(section, current))];
		const last = items.at(-1);
		if (last) last.current = true;
		return items;
	}

	const post = await findArchivePost(section, slug);
	if (post) {
		const parentSlug = segments.length > 2 ? segments.slice(1, -1).join("/") : undefined;
		const parent = await findArchiveCategory(section, parentSlug);
		const items: BreadcrumbItem[] = [
			home,
			...(await archiveTrail(section, parent)),
			{
				href: toArticlePath(post.link),
				label: wpText(post.title.rendered),
				current: true,
			},
		];
		return items;
	}

	const items: BreadcrumbItem[] = [home, ...(await archiveTrail(section, current))];
	const last = items.at(-1);
	if (last) last.current = true;
	return items;
}
