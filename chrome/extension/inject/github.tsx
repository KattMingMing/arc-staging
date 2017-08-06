import { useAccessToken } from "app/backend/xhr";
import { BlobAnnotator } from "app/components/BlobAnnotator";
import { ContextualSourcegraphButton } from "app/components/ContextualSourcegraphButton";
import { ProjectsOverview } from "app/components/ProjectsOverview";
import { injectRepositorySearchToggle } from "app/components/SearchToggle";
import { injectGitHub as injectGitHubEditor } from "app/editor/inject";
import * as github from "app/github/util";
import * as tooltips from "app/tooltips/dom";
import { ExtensionEventLogger } from "app/tracking/ExtensionEventLogger";
import { getPlatformName } from "app/util";
import { eventLogger, sourcegraphUrl } from "app/util/context";
import { GitHubBlobUrl, GitHubMode } from "app/util/types";
import * as React from "react";
import { render } from "react-dom";

const OPEN_ON_SOURCEGRAPH_ID = "open-on-sourcegraph";

export function injectGitHubApplication(marker: HTMLElement): void {
	window.addEventListener("load", () => {
		document.body.appendChild(marker);
		injectModules();
		chrome.runtime.sendMessage({ type: "getIdentity" }, (identity) => {
			if (identity) {
				(eventLogger as ExtensionEventLogger).updatePropsForUser(identity);
			}
		});
	});
	document.addEventListener("keydown", (e: KeyboardEvent) => {
		if (github.getGitHubRoute(window.location) !== "blob") {
			return;
		}
		if ((e.target as HTMLElement).tagName === "INPUT" ||
			(e.target as HTMLElement).tagName === "SELECT" ||
			(e.target as HTMLElement).tagName === "TEXTAREA") {
			return;
		}

		if (e.keyCode === 85) {
			const annButtons = document.getElementsByClassName("sourcegraph-app-annotator");
			if (annButtons.length === 1) {
				const annButtonA = annButtons[0].getElementsByTagName("A");
				if (annButtonA.length === 1 && (annButtonA[0] as any).href) {
					window.open((annButtonA[0] as any).href, "_blank");
				}
			}
		}
	});

	document.addEventListener("pjax:end", () => {
		(eventLogger as ExtensionEventLogger).updateIdentity();

		// Remove all ".sg-annotated"; this allows tooltip event handlers to be re-registered.
		Array.from(document.querySelectorAll(".sg-annotated")).forEach((item: any) => {
			if (item && item.classList) {
				item.classList.remove("sg-annotated");
			}
		});
		tooltips.hideTooltip();
		injectStaticModules();
		// Add file added listener on pjax end incase the listener was removed.
		initFileContainerListener();
	});

	// Add the file container added listener on first load.
	initFileContainerListener();
}

function initFileContainerListener(): void {
	const fileContainer = document.getElementById("files") as HTMLElement;
	if (!fileContainer) {
		return;
	}
	fileContainer.removeEventListener("DOMNodeInserted", () => addFileContainerListener(fileContainer));
	addFileContainerListener(fileContainer);
}

/**
 * Adds a listener to detect when additional blob file containers are added to the page.
 * This happens when large diffs are loaded with pagination instead of as a single fetch.
 */
function addFileContainerListener(fileContainer: HTMLElement): void {
	fileContainer.addEventListener("DOMNodeInserted", (mutation: MutationEvent) => {
		const relatedNode = mutation.relatedNode as HTMLElement;
		if (relatedNode && relatedNode.classList.contains("js-diff-progressive-container")) {
			injectBlobAnnotators();
		}
	}, false);
}

/**
 * injectStaticModules injects elements onto the DOM that are stateless
 * and do not fetch from our graphql endpoint on load. This should be called after
 * pjax ajax calls are performed so that content is always re-rendered when
 * the GitHub page is re-rendered.
 */
function injectStaticModules(): void {
	injectRepositorySearchToggle();
	injectOpenOnSourcegraphButton();
	injectBlobAnnotators();
}

function injectModules(): void {
	chrome.runtime.sendMessage({ type: "getSessionToken" }, (token) => {
		if (token) {
			useAccessToken(token);
		}
		injectStaticModules();
		injectSourcegraphInternalTools();
		injectGitHubEditor();
	});
}

function injectBlobAnnotators(): void {
	const { repoURI, isDelta } = github.parseURL();
	let { path } = github.parseURL();
	const gitHubState = github.getGitHubState(window.location.href);
	if (gitHubState && gitHubState.mode === GitHubMode.Blob && (gitHubState as GitHubBlobUrl).rev.indexOf("/") > 0) {
		// correct in case branch has slash in it
		path = (gitHubState as GitHubBlobUrl).path;
	}
	if (!repoURI) {
		console.error("cannot determine repo URI");
		return;
	}

	const uri = repoURI;
	function addBlobAnnotator(file: HTMLElement, mount: HTMLElement): void {
		const { headFilePath, baseFilePath } = isDelta ? github.getDeltaFileName(file) : { headFilePath: path, baseFilePath: null };
		if (!headFilePath) {
			console.error("cannot determine file path");
			return;
		}

		render(<BlobAnnotator headPath={headFilePath} repoURI={uri} fileElement={file} basePath={baseFilePath} />, mount);
	}

	const files = github.getFileContainers();
	for (const file of Array.from(files)) {
		const mount = github.createBlobAnnotatorMount(file);
		if (!mount) {
			return;
		}
		addBlobAnnotator(file, mount);
	}
}

function injectSourcegraphInternalTools(): void {
	if (document.getElementById("sourcegraph-projet-overview")) {
		return;
	}

	if (window.location.href === "https://github.com/orgs/sourcegraph/projects") {
		const container = document.querySelector("#projects-results")!.parentElement!.children[0];
		const mount = document.createElement("span");
		mount.id = "sourcegraph-projet-overview";
		(container as Element).insertBefore(mount, (container as Element).firstChild);
		render(<ProjectsOverview />, mount);
	}
}

/**
 * Appends an Open on Sourcegraph button to the GitHub DOM.
 * The button is only rendered on a repo homepage after the "find file" button.
 */
function injectOpenOnSourcegraphButton(): void {
	const container = createOpenOnSourcegraphIfNotExists();
	const pageheadActions = document.querySelector(".pagehead-actions");
	if (!pageheadActions || !pageheadActions.children.length) {
		return;
	}
	pageheadActions.insertBefore(container, pageheadActions.children[0]);
	if (container) {
		const url = openOnSourcegraphURL();
		if (url) {
			render(<ContextualSourcegraphButton />, container);
		}
	}
}

function createOpenOnSourcegraphIfNotExists(): HTMLElement {
	let container = document.getElementById(OPEN_ON_SOURCEGRAPH_ID);
	if (container) {
		container.remove();
	}

	container = document.createElement("li");
	container.id = OPEN_ON_SOURCEGRAPH_ID;
	return container;
}

function openOnSourcegraphURL(): string | undefined {
	const { uri, rev } = github.parseURL();
	if (uri) {
		const url = `${sourcegraphUrl}/${uri}`;
		if (rev) {
			return `${url}@${rev}`;
		}
		return `${url}?utm_source=${getPlatformName()}`;
	}
}
