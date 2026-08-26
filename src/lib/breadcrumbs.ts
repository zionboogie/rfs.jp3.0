import { navMenus } from "../data/courses";
import {
	findArchiveCategory,
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
	return {
		href: `/${section}/`,
		label: menu?.label ?? section,
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
	const items: BreadcrumbItem[] = [home, ...(await archiveTrail(section, current))];
	const last = items.at(-1);
	if (last) last.current = true;
	return items;
}
