import type { APIRoute } from "astro";
import { hiddenArchiveTitles, navMenus } from "../data/courses";
import { AUTHOR_NAME, AUTHOR_PATH, PUBLISHER_NAME, PUBLISHER_URL, SITE_NAME, toAbsoluteUrl } from "../lib/structured-data";
import { getLearnCourseSections, getVisibleArchiveGroups, type CategorySummary } from "../lib/wordpress";

const FALLBACK_ORIGIN = "https://rfs.jp";

function withTrailingSlash(path: string): string {
	if (!path.startsWith("/")) return `/${path}/`;
	return path.endsWith("/") ? path : `${path}/`;
}

function pageUrl(origin: string, path: string): string {
	return toAbsoluteUrl(origin, withTrailingSlash(path));
}

function oneLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function escapeLinkText(value: string): string {
	return value.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function listItem(origin: string, title: string, href: string, description?: string): string {
	const url = pageUrl(origin, href);
	const note = description ? oneLine(description) : "";
	const label = escapeLinkText(oneLine(title));
	return note ? `- [${label}](${url}): ${note}` : `- [${label}](${url})`;
}

function courseList(origin: string, courses: CategorySummary[]): string {
	return courses.map((course) => listItem(origin, course.title, course.href, course.description)).join("\n");
}

export const GET: APIRoute = async ({ site }) => {
	const origin = site?.origin ?? FALLBACK_ORIGIN;
	const siteName = SITE_NAME.trim();
	const aiWebHref = navMenus.find((menu) => menu.id === "ai-web-development")?.href;
	const gettingStartedHref = navMenus.find((menu) => menu.id === "getting-started")?.href;
	const archiveHref = navMenus.find((menu) => menu.id === "archive")?.href ?? "/archive/";

	const [learnSections, archiveGroups] = await Promise.all([
		getLearnCourseSections(),
		getVisibleArchiveGroups(hiddenArchiveTitles),
	]);

	const aiWeb = learnSections.find((section) => section.href === aiWebHref);
	const gettingStarted = learnSections.find((section) => section.href === gettingStartedHref);
	const featuredHrefs = new Set([aiWebHref, gettingStartedHref].filter((href): href is string => Boolean(href)));
	const otherLearn = learnSections.filter((section) => !featuredHrefs.has(section.href));

	const sections: string[] = [
		`# RFS.jp`,
		`> ${siteName}は、Web制作を学び始めた人向けの日本語学習サイトです。AIと一緒にHTML、CSS、JavaScript、WordPressなどを学びます。運営は${PUBLISHER_NAME}です。`,
		`このファイルはRFS.jpの目次です。全記事の一覧ではありません。学習の入口となるコースとカテゴリだけを案内します。詳細が必要なときは、該当するリンク先を読んでください。`,
		`記事は日本語です。暗記より「なぜそうするのか」の理解と、コードを実際に試すことを重視しています。過去アーカイブは現行コースより古い内容を含みます。サイト内検索（/search/）は学習の目次ではありません。`,
		`## サイト`,
		[
			listItem(origin, "トップ", "/", "現行コースとアーカイブの一覧"),
			listItem(origin, "著者", AUTHOR_PATH, AUTHOR_NAME),
			listItem(origin, "過去アーカイブ", archiveHref, "旧講座のカテゴリ一覧"),
		].join("\n"),
	];

	if (aiWeb) {
		sections.push(`## ${oneLine(aiWeb.title)}`);
		sections.push(
			[
				listItem(origin, aiWeb.title, aiWeb.href, aiWeb.description || "AI時代のWeb言語入門"),
				...aiWeb.courses.map((course) => listItem(origin, course.title, course.href, course.description)),
			].join("\n"),
		);
	}

	if (gettingStarted) {
		sections.push(`## ${oneLine(gettingStarted.title)}`);
		sections.push(
			[
				listItem(origin, gettingStarted.title, gettingStarted.href, gettingStarted.description || "学習方法と便利なツール"),
				...gettingStarted.courses.map((course) => listItem(origin, course.title, course.href, course.description)),
			].join("\n"),
		);
	}

	for (const group of archiveGroups) {
		sections.push(`## 過去アーカイブ（${oneLine(group.title)}）`);
		if (group.children.length > 0) sections.push(courseList(origin, group.children));
	}

	const optionalItems: string[] = [
		`- [運営会社](${PUBLISHER_URL}): ${PUBLISHER_NAME}`,
		`- [sitemap.xml](${toAbsoluteUrl(origin, "/sitemap.xml")}): 公開ページの全URL`,
		`- [robots.txt](${toAbsoluteUrl(origin, "/robots.txt")}): クローラ向けの許可範囲`,
	];

	for (const section of otherLearn) {
		optionalItems.push(listItem(origin, section.title, section.href, section.description));
		if (section.courses.length > 0) optionalItems.push(courseList(origin, section.courses));
	}

	sections.push(`## Optional`);
	sections.push(optionalItems.join("\n"));

	return new Response(`${sections.filter(Boolean).join("\n\n")}\n`, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
		},
	});
};
