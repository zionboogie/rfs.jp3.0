export type AboutSlide = {
	number: string;
	image: string;
	icon: string;
	/** 改行は <br> または \n で指定 */
	title: string;
	catchCopy: string[];
};

export const aboutSlides: AboutSlide[] = [
	{
		number: "01",
		image: "/common/img/top/bg01.jpg",
		icon: "",
		title: "AI時代の<br>クリエイティビティ",
		catchCopy: ["AIに聞いて、試して、また考える。", "自分一人じゃないのが楽しい。"],
	},
	{
		number: "02",
		image: "/common/img/top/bg02.jpg",
		icon: "",
		title: "AIと一緒なら、<br>もっと自由に",
		catchCopy: ["今日もコードを書こう。", "AIと旅に出よう。"],
	},
];

export const aboutSlideAssetUrls = [
	...new Set(
		aboutSlides.flatMap((slide) => [slide.image, slide.icon].filter(Boolean)),
	),
];

export type TitleToken =
	| { type: "br" }
	| { type: "char"; value: string; index: number };

/** タイトルを1文字ずつ + 改行トークンに分解（<br> / \n 対応） */
export function parseTitleTokens(title: string): { tokens: TitleToken[]; charCount: number } {
	const normalized = title.replace(/<br\s*\/?>/gi, "\n");
	const lines = normalized.split("\n");
	const tokens: TitleToken[] = [];
	let charIndex = 0;

	lines.forEach((line, lineIndex) => {
		if (lineIndex > 0) {
			tokens.push({ type: "br" });
		}
		for (const char of [...line]) {
			tokens.push({ type: "char", value: char, index: charIndex });
			charIndex += 1;
		}
	});

	return { tokens, charCount: charIndex };
}

export function plainTitle(title: string): string {
	return title.replace(/<br\s*\/?>/gi, "").replace(/\n/g, "");
}

export type CatchChar = { value: string; index: number };

/** キャッチコピーを行ごと・1文字ずつに分解 */
export function parseCatchLines(lines: string[]): { chars: CatchChar[] }[] {
	let charIndex = 0;
	return lines.map((line) => ({
		chars: [...line].map((value) => {
			const current = charIndex;
			charIndex += 1;
			return { value, index: current };
		}),
	}));
}

export function catchCharCount(lines: string[]): number {
	return lines.reduce((sum, line) => sum + [...line].length, 0);
}
