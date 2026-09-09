import type { APIRoute } from "astro";
import {
	decodeTagSlug,
	findArchiveCategory,
	getArchiveArticlePosts,
	getArchiveCategories,
	getTaggedArchiveTags,
	toArticlePath,
	toSitePath,
} from "../lib/wordpress";

const FALLBACK_ORIGIN = "https://rfs.jp";
const STATIC_PATHS = ["/", "/archive/", "/author/"] as const;
const SECTION_SLUGS = ["sb", "server", "learn"] as const;

type SitemapEntry = {
	loc: string;
	lastmod?: string;
};

function withTrailingSlash(path: string): string {
	if (!path.startsWith("/")) return `/${path}/`;
	return path.endsWith("/") ? path : `${path}/`;
}

function toAbsoluteUrl(origin: string, path: string): string {
	return new URL(withTrailingSlash(path), origin).href;
}

function escapeXml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function toLastmod(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString().slice(0, 10);
}

function addEntry(entries: Map<string, SitemapEntry>, origin: string, path: string, lastmod?: string) {
	const loc = toAbsoluteUrl(origin, path);
	const next: SitemapEntry = { loc, lastmod: toLastmod(lastmod) };
	const current = entries.get(loc);
	if (!current) {
		entries.set(loc, next);
		return;
	}
	if (next.lastmod && (!current.lastmod || next.lastmod > current.lastmod)) {
		entries.set(loc, next);
	}
}

function renderSitemap(entries: SitemapEntry[]): string {
	const urls = entries
		.map((entry) => {
			const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
			return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const GET: APIRoute = async ({ site }) => {
	const origin = site?.origin ?? FALLBACK_ORIGIN;
	const entries = new Map<string, SitemapEntry>();

	for (const path of STATIC_PATHS) {
		addEntry(entries, origin, path);
	}

	const [sectionCategories, categories, articles, tags] = await Promise.all([
		Promise.all(SECTION_SLUGS.map((section) => findArchiveCategory(section))),
		getArchiveCategories(),
		getArchiveArticlePosts(),
		getTaggedArchiveTags(),
	]);

	for (const category of sectionCategories) {
		if (!category) continue;
		addEntry(entries, origin, toSitePath(category.link));
	}

	for (const category of categories) {
		addEntry(entries, origin, toSitePath(category.link));
	}

	for (const article of articles) {
		addEntry(entries, origin, toArticlePath(article.link), article.modified || article.date);
	}

	for (const tag of tags) {
		addEntry(entries, origin, `/tag/${decodeTagSlug(tag.slug)}/`);
	}

	return new Response(renderSitemap([...entries.values()]), {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
};
