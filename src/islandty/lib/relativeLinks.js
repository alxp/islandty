/** Referring to HtmlBasePlugin.js
 *
 *  This plugin tries to make all URLs in the HTML output relative to the page.
 *
 *  Useful for:
 *  * browsing via file://
 *  * gh-pages in subdirectory repo
 *  * unsure where in the directory structure the site will be hosted
 *
 *  We're expecting the internal links to start with "/"
 *
 *  todo?
 *  * option to include "index.html" for those directory links, for extra file:// compat
 *
 * This solution from https://github.com/11ty/eleventy/discussions/2516#discussioncomment-11999750 
 * 
 */

const path = require('path');

module.exports = function (eleventyConfig) {
	// Apply to all HTML output in your project
	eleventyConfig.htmlTransformer.addUrlTransform(
		"html",
		function makeUrlRelative(urlInMarkup) {
			// Skip empty URLs, non-root-relative URLs, and dev server image transform URLs
			if (
				!urlInMarkup 
				|| !urlInMarkup.startsWith("/") 
				|| urlInMarkup.startsWith("/.11ty/") 
				|| urlInMarkup.startsWith("//")
			) {
				return urlInMarkup;
			}

			// Get base directory path (keep trailing slash for index pages)
			const fromDir = this.url.endsWith("/") ? this.url : path.dirname(this.url);

			let relativePath = path.relative(fromDir, urlInMarkup);

			// Add ./ for same-directory references
			if (!relativePath.startsWith(".")) {
				relativePath = "./" + relativePath;
			}

			// Preserve trailing slash from original URL
			if (urlInMarkup.endsWith("/") && !relativePath.endsWith("/")) {
				relativePath += "/";
			}

			// console.log(this.url, fromDir, urlInMarkup, relativePath);
			return relativePath;
		},
		{
			priority: -1, // run last last (after PathToUrl)
		},
	);
}