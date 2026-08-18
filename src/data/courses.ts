export type Course = {
	title: string;
	description: string;
	href: string;
	iconLabel: string;
	iconColor: string;
	iconTextColor?: string;
};

export type NavMenu = {
	id: string;
	label: string;
	href: string;
	lead: string;
	items: Course[];
};

export const languageCourses: Course[] = [
	{
		title: "HTML入門",
		description: "Webページの構造を作る基本言語。タグや要素の使い方から学びます。",
		href: "/html/",
		iconLabel: "HTML",
		iconColor: "#e44d26",
	},
	{
		title: "CSS入門",
		description: "色・レイアウト・デザインを整えるスタイル言語の基礎を学びます。",
		href: "/css/",
		iconLabel: "CSS",
		iconColor: "#264de4",
	},
	{
		title: "JavaScript入門",
		description: "Webページに動きを加えるプログラミング言語の入門コースです。",
		href: "/javascript/",
		iconLabel: "JS",
		iconColor: "#f7df1e",
		iconTextColor: "#1a1a1a",
	},
	{
		title: "SQL入門",
		description: "データベースからデータを取得・更新するための言語を学びます。",
		href: "/sql/",
		iconLabel: "SQL",
		iconColor: "#00758f",
	},
	{
		title: "PHP入門",
		description: "サーバーサイドで動くWebアプリケーション開発の基礎を学びます。",
		href: "/php/",
		iconLabel: "PHP",
		iconColor: "#777bb4",
	},
	{
		title: "Python入門",
		description: "読みやすい文法で、Web開発からデータ処理まで幅広く使える言語です。",
		href: "/python/",
		iconLabel: "PY",
		iconColor: "#3776ab",
	},
];

export const webBasicsCourses: Course[] = [
	{
		title: "Git/Githubを学ぼう",
		description: "ソースコードのバージョン管理と共同開発の基本を学びます。",
		href: "/git/",
		iconLabel: "Git",
		iconColor: "#f05032",
	},
	{
		title: "WordPressを学ぼう",
		description: "ブログやWebサイトを素早く作るCMSの使い方を学びます。",
		href: "/wordpress/",
		iconLabel: "WP",
		iconColor: "#21759b",
	},
	{
		title: "MySQLを学ぼう",
		description: "Webアプリでよく使われるリレーショナルデータベースの基礎を学びます。",
		href: "/mysql/",
		iconLabel: "SQL",
		iconColor: "#4479a1",
	},
	{
		title: "Apacheを学ぼう",
		description: "Webサーバーの役割と設定の基本を学び、公開の仕組みを理解します。",
		href: "/apache/",
		iconLabel: "HTTP",
		iconColor: "#d22128",
	},
];

export const aiCourses: Course[] = [
	{
		title: "Cursorを学ぼう",
		description: "AI支援エディタを使った効率的な開発の進め方を学びます。",
		href: "/cursor/",
		iconLabel: "AI",
		iconColor: "#1a1a1a",
	},
];

export const navMenus: NavMenu[] = [
	{
		id: "programming-languages",
		label: "プログラミング言語",
		href: "/#programming-languages",
		lead: "プログラミング言語の入門コースから始めましょう",
		items: languageCourses,
	},
	{
		id: "web-basics",
		label: "Web開発の基礎",
		href: "/#web-basics",
		lead: "Web制作・開発に必要なツールと環境を学びましょう",
		items: webBasicsCourses,
	},
	{
		id: "ai",
		label: "AIを使う",
		href: "/#ai",
		lead: "AIツールを活用して、開発を効率的に進めましょう",
		items: aiCourses,
	},
];
