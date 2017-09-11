import { isBrowserExtension, openInEditorEnabled, sourcegraphUrl } from "app/util/context";
import { Domain, OpenInSourcegraphProps } from "app/util/types";

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
	"php", // PHP
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
		case "php":
		case "phtml":
		case "php3":
		case "php4":
		case "php5":
		case "php6":
		case "php7":
		case "phps":
			return "php";
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

export function getOpenInSourcegraphUrl(props: OpenInSourcegraphProps): string {
	// Build URL to open in editor
	if (openInEditorEnabled) {
		let openUrl = `src-insiders://open?repo=${props.repoUri}&vcs=git`;
		if (props.rev) {
			openUrl = `${openUrl}&revision=${props.rev}`;
		}
		if (props.path) {
			openUrl = `${openUrl}&path=${props.path}`;
		}
		if (props.coords) {
			openUrl = `${openUrl}:${props.coords.line}:${props.coords.char}`;
		}
		return openUrl;
	}

	// Build URL for Web
	let url = `${sourcegraphUrl}/${props.repoUri}`;
	if (props.rev) {
		url = `${url}@${props.rev}`;
	}
	if (props.path) {
		url = `${url}/-/blob/${props.path}`;
	}
	if (props.query) {
		if (props.query.diff) {
			url = `${url}?diff=${props.query.diff.rev}&utm_source=${getPlatformName()}`;
		} else if (props.query.search) {
			url = `${url}?q=${props.query.search}&utm_source=${getPlatformName()}`;
		}
	}
	if (props.coords) {
		url = `${url}#L${props.coords.line}:${props.coords.char}`;
	}
	if (props.fragment) {
		url = `${url}$${props.fragment}`;
	}
	return url;
}
