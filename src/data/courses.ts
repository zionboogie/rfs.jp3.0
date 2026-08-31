export type NavMenu = {
	id: string;
	label: string;
	href: string;
};

export const navMenus: NavMenu[] = [
	{
		id: "ai-web-development",
		label: "AIと学ぶWeb制作",
		href: "/learn/ai-web-development/",
	},
	{
		id: "getting-started",
		label: "知ってお得な学習方法",
		href: "/learn/getting-started/",
	},
	{
		id: "archive",
		label: "アーカイブ",
		href: "/archive/",
	},
];

/** トップのアーカイブ一覧で出さないカテゴリ（記事サイドバーでも同じ） */
export const hiddenArchiveTitles = new Set([
	"ActionScript講座",
	"Atom講座",
	"スマホ・モバイル講座",
	"Samba",
	"Namazu",
]);
