export type NavMenu = {
	id: string;
	label: string;
	href: string;
};

export const navMenus: NavMenu[] = [
	{
		id: "ai-web-development",
		label: "AIと学ぶWeb言語",
		href: "/learn/ai-web-development/",
	},
	{
		id: "getting-started",
		label: "学習方法と便利なツール",
		href: "/learn/getting-started/",
	},
	{
		id: "archive",
		label: "過去アーカイブ",
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
