export type NavMenu = {
	id: string;
	label: string;
	href: string;
};

export const navMenus: NavMenu[] = [
	{
		id: "lern",
		label: "開発と学習",
		href: "/lern/",
	},
	{
		id: "sb",
		label: "Programming",
		href: "/sb/",
	},
	{
		id: "server",
		label: "Server",
		href: "/server/",
	},
];
