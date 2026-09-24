/**
 * GA4 から直近 7 日の人気ページを取得し、JSON を出力する。
 * 本番サーバーの cron で毎日実行する想定。
 *
 * 手動:
 *   node scripts/fetch-popular-articles.mjs
 *
 * 本番 crontab 例（毎日 5:00 JST）:
 *   0 5 * * * cd /path/to/rfs.jp3.0 && /usr/bin/node scripts/fetch-popular-articles.mjs >> /var/log/popular-articles.log 2>&1
 *
 * 環境変数（リポジトリ直下の .env でも可）:
 *   GA4_PROPERTY_ID            必須（例: 123456789 または properties/123456789）
 *   GA4_SERVICE_ACCOUNT_JSON   サービスアカウント JSON（文字列）
 *   または GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY
 *   または GOOGLE_APPLICATION_CREDENTIALS（JSON ファイルパス）
 *   GA4_HOSTNAME               任意。指定時はそのホストだけ集計（本番は rfs.jp）
 *   POPULAR_ARTICLES_PATH      任意。公開ディレクトリの絶対パスを指定する
 *                              例: /var/www/html/popular-articles.json
 *                              未指定時は public/popular-articles.json
 */
import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

// const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = dirname(fileURLToPath(import.meta.url));
const LIMIT = 5;
const RANGE_DAYS = 7;
const PATH_PREFIXES = ["/learn/", "/sb/", "/server/"];
const ROOT_PATHS = new Set(["/learn/", "/sb/", "/server/"]);
/** カテゴリ一覧ページの document title に含まれる文言（src/lib/seo.ts の categoryListTitle） */
const CATEGORY_LIST_TITLE_MARK = "コース一覧";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

loadDotEnv(join(ROOT, ".env"));

const propertyId = normalizePropertyId(requiredEnv("GA4_PROPERTY_ID"));
const credentials = loadCredentials();
const hostname = process.env.GA4_HOSTNAME?.trim() || "";
const outPath = resolveOutPath(process.env.POPULAR_ARTICLES_PATH);

const accessToken = await getAccessToken(credentials);
const rows = await runReport(accessToken, propertyId, hostname);
const articles = rankArticles(rows).slice(0, LIMIT);

const payload = {
	generatedAt: new Date().toISOString(),
	rangeDays: RANGE_DAYS,
	articles,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, "\t")}\n`, "utf8");
console.log(`wrote ${articles.length} articles to ${outPath}`);

function loadDotEnv(filePath) {
	if (!existsSync(filePath)) return;
	const text = readFileSync(filePath, "utf8");
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const index = trimmed.indexOf("=");
		if (index <= 0) continue;
		const key = trimmed.slice(0, index).trim();
		let value = trimmed.slice(index + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

function requiredEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} が設定されていません`);
	}
	return value;
}

function normalizePropertyId(value) {
	return value.replace(/^properties\//, "");
}

function loadCredentials() {
	const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
	if (json) return parseServiceAccount(json);

	const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
	if (filePath) {
		const resolved = isAbsolute(filePath) ? filePath : join(ROOT, filePath);
		return parseServiceAccount(readFileSync(resolved, "utf8"));
	}

	const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
	const privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY ?? "");
	if (clientEmail && privateKey) {
		return { client_email: clientEmail, private_key: privateKey };
	}

	throw new Error(
		"GA4 の認証情報がありません。GA4_SERVICE_ACCOUNT_JSON、GOOGLE_APPLICATION_CREDENTIALS、または GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY を設定してください。",
	);
}

function parseServiceAccount(raw) {
	const data = JSON.parse(raw);
	if (!data.client_email || !data.private_key) {
		throw new Error("サービスアカウント JSON に client_email / private_key がありません");
	}
	return {
		client_email: data.client_email,
		private_key: normalizePrivateKey(data.private_key),
	};
}

function normalizePrivateKey(value) {
	return value.replace(/\\n/g, "\n").trim();
}

function resolveOutPath(raw) {
	const value = raw?.trim() || "public/popular-articles.json";
	return isAbsolute(value) ? value : join(ROOT, value);
}

async function getAccessToken(account) {
	const now = Math.floor(Date.now() / 1000);
	const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claim = base64Url(
		JSON.stringify({
			iss: account.client_email,
			scope: SCOPE,
			aud: TOKEN_URL,
			iat: now,
			exp: now + 3600,
		}),
	);
	const unsigned = `${header}.${claim}`;
	const signer = createSign("RSA-SHA256");
	signer.update(unsigned);
	const jwt = `${unsigned}.${signer.sign(account.private_key, "base64url")}`;

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});
	const data = await response.json();
	if (!response.ok || !data.access_token) {
		throw new Error(`GA4 トークン取得に失敗しました: ${JSON.stringify(data)}`);
	}
	return data.access_token;
}

async function runReport(accessToken, property, host) {
	const dimensionFilter = {
		orGroup: {
			expressions: PATH_PREFIXES.map((prefix) => ({
				filter: {
					fieldName: "pagePath",
					stringFilter: { matchType: "BEGINS_WITH", value: prefix },
				},
			})),
		},
	};
	const request = {
		dateRanges: [{ startDate: `${RANGE_DAYS}daysAgo`, endDate: "today" }],
		dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
		metrics: [{ name: "screenPageViews" }],
		dimensionFilter: host
			? {
				andGroup: {
					expressions: [
						dimensionFilter,
						{
							filter: {
								fieldName: "hostName",
								stringFilter: { matchType: "EXACT", value: host },
							},
						},
					],
				},
			}
			: dimensionFilter,
		orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
		limit: "200",
	};

	const response = await fetch(
		`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		},
	);
	const data = await response.json();
	if (!response.ok) {
		throw new Error(`GA4 レポート取得に失敗しました: ${JSON.stringify(data)}`);
	}
	return Array.isArray(data.rows) ? data.rows : [];
}

function rankArticles(rows) {
	/** @type {Map<string, { title: string; href: string; views: number }>} */
	const merged = new Map();

	for (const row of rows) {
		const pagePath = row.dimensionValues?.[0]?.value ?? "";
		const pageTitle = row.dimensionValues?.[1]?.value ?? "";
		const views = Number(row.metricValues?.[0]?.value ?? 0);
		const href = normalizePath(pagePath);
		if (!isArticleDetailPath(href, pageTitle)) continue;
		if (!Number.isFinite(views) || views <= 0) continue;

		const current = merged.get(href);
		if (current) {
			current.views += views;
			if (pageTitle && pageTitle.length > current.title.length) {
				current.title = displayTitle(pageTitle, href);
			}
			continue;
		}
		merged.set(href, {
			title: displayTitle(pageTitle, href),
			href,
			views,
		});
	}

	return [...merged.values()]
		.sort((a, b) => b.views - a.views || a.href.localeCompare(b.href))
		.map(({ title, href }) => ({ title, href }));
}

function normalizePath(value) {
	const path = value.split("?")[0].split("#")[0].trim();
	if (!path.startsWith("/")) return "";
	const withoutIndex = path.replace(/\/index\.html$/i, "/");
	const withoutHtml = withoutIndex.replace(/\.html\/?$/i, "/");
	return withoutHtml.endsWith("/") ? withoutHtml : `${withoutHtml}/`;
}

/**
 * 記事詳細だけを残す。
 * - /learn/ /sb/ /server/ 配下
 * - セクション直下（/learn/ 等）は除外
 * - カテゴリ一覧（タイトルに「コース一覧」）は除外
 * - /sb/ /server/ は /section/category/article/ 以上（3段）のみ
 * - /learn/ は /learn/slug/ 以上（記事 CPT がこの深さのため）
 */
function isArticleDetailPath(href, pageTitle) {
	if (!href || ROOT_PATHS.has(href)) return false;
	if (!PATH_PREFIXES.some((prefix) => href.startsWith(prefix))) return false;
	if (String(pageTitle).includes(CATEGORY_LIST_TITLE_MARK)) return false;

	const segments = href.split("/").filter(Boolean);
	const section = segments[0];
	if (section === "sb" || section === "server") {
		return segments.length >= 3;
	}
	if (section === "learn") {
		return segments.length >= 2;
	}
	return false;
}

function displayTitle(pageTitle, href) {
	let title = pageTitle.replace(/\s+/g, " ").trim();
	title = title.replace(/\s*\[Smart\]\s*$/u, "");
	title = title.replace(/\s*\|\s*Smart\s*$/u, "");
	const pipe = title.indexOf(" | ");
	if (pipe > 0) title = title.slice(0, pipe).trim();
	if (title) return title;
	const segment = href.replace(/\/$/, "").split("/").pop() ?? href;
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

function base64Url(value) {
	return Buffer.from(value).toString("base64url");
}
