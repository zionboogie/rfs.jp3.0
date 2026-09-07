import { SITE_NAME, toAbsoluteUrl } from "./structured-data";

export const OGP_IMAGE_PATH = "/ogp.png";

export type SeoType = "website" | "article";

export type SeoInput = {
	title?: string;
	description?: string;
	type?: SeoType;
	noindex?: boolean;
	pathname: string;
	site: URL | undefined;
	fallbackOrigin: string;
};

export type SeoMeta = {
	title: string;
	description: string;
	canonical: string;
	imageUrl: string;
	type: SeoType;
	noindex: boolean;
	siteName: string;
};

export function resolveSiteOrigin(site: URL | undefined, fallbackOrigin: string): string {
	if (site) return site.origin;
	return fallbackOrigin;
}

function documentTitle(pageTitle?: string): string {
	const trimmed = pageTitle?.trim();
	if (!trimmed || trimmed === SITE_NAME) return SITE_NAME;
	return `${trimmed} | ${SITE_NAME}`;
}

export function categoryListTitle(categoryName: string): string {
	return `【${categoryName.trim()}】 コース一覧`;
}

function toCanonicalUrl(origin: string, pathname: string): string {
	const url = new URL(pathname, origin);
	if (!url.pathname.endsWith("/")) {
		url.pathname += "/";
	}
	url.search = "";
	url.hash = "";
	return url.href;
}

export function buildSeo(input: SeoInput): SeoMeta {
	const origin = resolveSiteOrigin(input.site, input.fallbackOrigin);
	const pageTitle = input.title?.trim() ?? "";

	return {
		title: documentTitle(pageTitle),
		description: input.description?.trim() || pageTitle || SITE_NAME,
		canonical: toCanonicalUrl(origin, input.pathname),
		imageUrl: toAbsoluteUrl(origin, OGP_IMAGE_PATH),
		type: input.type ?? "website",
		noindex: Boolean(input.noindex),
		siteName: SITE_NAME,
	};
}
