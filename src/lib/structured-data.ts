export const SITE_NAME = " 初心者向けプログラミング学習 Smart";
export const PUBLISHER_NAME = "rhythmfactory Ltd.";
export const PUBLISHER_URL = "https://rhythmfactory.jp/";
export const DEFAULT_CATCH_IMAGE_PATH = "/common/img/catch.webp";
export const AUTHOR_NAME = "あおいパスタ";
export const AUTHOR_PATH = "/author/";

export type JsonLdListItem = {
	name: string;
	url: string;
};

export function stringifyJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function toAbsoluteUrl(origin: string, pathOrUrl: string): string {
	return new URL(pathOrUrl, origin).href;
}

function toPageUrl(origin: string, pathOrUrl: string): string {
	const url = new URL(pathOrUrl, origin);
	if (!url.pathname.endsWith("/")) {
		url.pathname += "/";
	}
	return url.href;
}

function publisher() {
	return {
		"@type": "Organization",
		name: PUBLISHER_NAME,
		url: PUBLISHER_URL,
	};
}

function itemListElement(origin: string, items: JsonLdListItem[]) {
	return items.map((item, index) => ({
		"@type": "ListItem",
		position: index + 1,
		name: item.name,
		url: toPageUrl(origin, item.url),
	}));
}

function articleImage(origin: string, imageUrl: string | null, imageWidth: number | null, imageHeight: number | null) {
	const url = toAbsoluteUrl(origin, imageUrl || DEFAULT_CATCH_IMAGE_PATH);
	if (imageUrl && imageWidth && imageHeight) {
		return {
			"@type": "ImageObject",
			url,
			width: imageWidth,
			height: imageHeight,
		};
	}
	return url;
}

export function websiteJsonLd(input: {
	origin: string;
	description: string;
	items: JsonLdListItem[];
}): string {
	const graph: Record<string, unknown>[] = [
		{
			"@type": "WebSite",
			name: SITE_NAME,
			url: toPageUrl(input.origin, "/"),
			description: input.description,
			inLanguage: "ja",
			publisher: publisher(),
			potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: `${toPageUrl(input.origin, "/search/")}?q={search_term_string}`,
				},
				"query-input": "required name=search_term_string",
			},
		},
		publisher(),
	];

	if (input.items.length > 0) {
		graph.push({
			"@type": "ItemList",
			name: "コース一覧",
			itemListElement: itemListElement(input.origin, input.items),
		});
	}

	return stringifyJsonLd({
		"@context": "https://schema.org",
		"@graph": graph,
	});
}

export function collectionJsonLd(input: {
	origin: string;
	name: string;
	description: string;
	url: string;
	items: JsonLdListItem[];
}): string {
	const page: Record<string, unknown> = {
		"@type": "CollectionPage",
		name: input.name,
		url: toPageUrl(input.origin, input.url),
		inLanguage: "ja",
		isPartOf: {
			"@type": "WebSite",
			name: SITE_NAME,
			url: toAbsoluteUrl(input.origin, "/"),
		},
	};

	if (input.description) page.description = input.description;
	if (input.items.length > 0) {
		page.mainEntity = {
			"@type": "ItemList",
			name: input.name,
			numberOfItems: input.items.length,
			itemListElement: itemListElement(input.origin, input.items),
		};
	}

	return stringifyJsonLd({
		"@context": "https://schema.org",
		...page,
	});
}

export function techArticleJsonLd(input: {
	origin: string;
	headline: string;
	description: string;
	url: string;
	datePublished: string;
	dateModified: string;
	imageUrl: string | null;
	imageWidth: number | null;
	imageHeight: number | null;
}): string {
	const pageUrl = toPageUrl(input.origin, input.url);

	return stringifyJsonLd({
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: input.headline,
		description: input.description,
		url: pageUrl,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": pageUrl,
		},
		datePublished: input.datePublished,
		dateModified: input.dateModified,
		inLanguage: "ja",
		image: articleImage(input.origin, input.imageUrl, input.imageWidth, input.imageHeight),
		author: {
			"@type": "Person",
			name: AUTHOR_NAME,
			url: toPageUrl(input.origin, AUTHOR_PATH),
		},
		publisher: publisher(),
	});
}
