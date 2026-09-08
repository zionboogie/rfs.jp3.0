import { defineMiddleware } from "astro:middleware";

/** WP の `.html` permalink を Astro の記事ルートへ内部 rewrite する */
export const onRequest = defineMiddleware((context, next) => {
	const { pathname } = context.url;
	if (/\.html\/?$/i.test(pathname)) {
		return next(pathname.replace(/\.html\/?$/i, "/"));
	}
	return next();
});
