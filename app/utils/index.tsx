import { isBrowserExtension } from "./context";
import { Domain } from "./types";

/**
 * supportedExtensions are the file extensions
 * the extension will apply annotations to
 */
export const supportedExtensions = new Set<string>([
	"go", // Golang
	"ts", "tsx", // TypeScript
	"js", "jsx", // JavaScript
	"java", // Java
	"py", // Python
]);

/**
 * getModeFromExtension returns the LSP mode for the
 * provided file extension (e.g. "jsx")
 */
export function getModeFromExtension(ext: string): string {
	switch (ext) {
		case "go":
			return "go";
		case "ts":
		case "tsx":
			return "typescript";
		case "js":
		case "jsx":
			return "javascript";
		case "java":
			return "java";
		case "py":
		case "pyc":
		case "pyd":
		case "pyo":
		case "pyw":
		case "pyz":
			return "python";
		default:
			return "unknown";
	}
}

export function getPathExtension(path: string): string {
	const pathSplit = path.split(".");
	if (pathSplit.length === 1) {
		return "";
	}
	if (pathSplit.length === 2 && pathSplit[0] === "") {
		return ""; // e.g. .gitignore
	}
	return pathSplit[pathSplit.length - 1].toLowerCase();
}

export function getPlatformName(): string {
	if (!isBrowserExtension()) {
		return "phabricator-integration";
	}
	return isFirefoxExtension() ? "firefox-extension" : "chrome-extension";
}

export function isFirefoxExtension(): boolean {
	return window.navigator.userAgent.indexOf("Firefox") !== -1;
}

export function isE2ETest(): boolean {
	return process.env.NODE_ENV === "test";
}

export function getDomain(loc: Location = window.location): Domain {
	if (/^https?:\/\/phabricator.aws.sgdev.org/.test(loc.href)) {
		return Domain.SGDEV_PHABRICATOR;
	}
	if (/^https?:\/\/(www.)?github.com/.test(loc.href)) {
		return Domain.GITHUB;
	}
	if (/^https?:\/\/(www.)?sourcegraph.com/.test(loc.href)) {
		return Domain.SOURCEGRAPH;
	}
	if (/^https?:\/\/(www.)?localhost:7990/.test(loc.href)) {
		return Domain.SGDEV_BITBUCKET;
	}
	throw new Error(`Unable to determine the domain, ${loc.href}`);
}

/**
 * This method created a unique username based on the platform and domain the user is visiting.
 * Examples: sg_dev_phabricator:matt , or uber_phabricator:matt
 */
export function getDomainUsername(domain: string, username: string): string {
	return `${domain}:${username}`;
}

export function getSourcegraphBlobUrl(sourcegraphUrl: string, repoUri: string, path: string, commitId?: string): string {
	const commitString = commitId ? `@${commitId}` : "";
	return `${sourcegraphUrl}/${repoUri}${commitString}/-/blob/${path}?utm_source=${getPlatformName()}`;
}
