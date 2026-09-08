/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly WORDPRESS_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface Window {
	Prism?: {
		highlightAllUnder: (element: ParentNode) => void;
	};
}
