import * as backend from "app/backend";
import { useAccessToken } from "app/backend/xhr";
import { BlobAnnotator } from "app/components/BlobAnnotator";
import { ContextualSourcegraphButton } from "app/components/ContextualSourcegraphButton";
import { injectRepositorySearchToggle } from "app/components/SearchToggle";
import { TreeViewer } from "app/components/tree/TreeViewer";
import { injectGitHub as injectGitHubEditor } from "app/editor/inject";
import * as github from "app/github/util";
import { buildFileTree } from "app/sourcegraph/util";
import * as tooltips from "app/tooltips/dom";
import { ExtensionEventLogger } from "app/tracking/ExtensionEventLogger";
import { getPlatformName } from "app/util";
import { eventLogger, repositoryFileTreeEnabled, sourcegraphUrl } from "app/util/context";
import { GitHubBlobUrl, GitHubMode } from "app/util/types";
import * as _ from "lodash";
import * as React from "react";
import { render } from "react-dom";

const $ = require("jquery");
require("jquery-pjax");
require("jquery-resizable-dom");

const OPEN_ON_SOURCEGRAPH_ID = "open-on-sourcegraph";

export function injectGitHubApplication(marker: HTMLElement): void {
	window.addEventListener("load", () => {
		document.body.appendChild(marker);
		injectModules(true);
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

	$(document).on("pjax:end", () => {
		(eventLogger as ExtensionEventLogger).updateIdentity();

		// Remove all ".sg-annotated"; this allows tooltip event handlers to be re-registered.
		Array.from(document.querySelectorAll(".sg-annotated")).forEach((item: any) => {
			if (item && item.classList) {
				item.classList.remove("sg-annotated");
			}
		});
		tooltips.hideTooltip();
		injectModules();
	});

	$(document).on("pjax:popstate", () => {
		injectModules();
	});

	window.addEventListener("resize", _.debounce(() => {
		chrome.storage.sync.get(items => {
			const toggled = items.treeViewToggled === undefined ? true : items.treeViewToggled;
			updateMarginForWidth(toggled);
		});
	}, 500, { trailing: true }), true);
}

function injectModules(refreshSessionToken?: boolean): void {
	if (!refreshSessionToken) {
		inject();
		return;
	}

	chrome.runtime.sendMessage({ type: "getSessionToken" }, (token) => {
		if (token) {
			useAccessToken(token);
		}
		inject();
	});
}

function inject(): void {
	injectRepositorySearchToggle();
	injectOpenOnSourcegraphButton();
	injectBlobAnnotators();
	injectGitHubEditor();
	injectFileTree();
	selectTreeNodeForURL();
}

function hideFileTree(): void {
	const tree = document.getElementById("sourcegraph-file-tree");
	document.body.style.marginLeft = "0px";
	if (!tree || !tree.parentNode) {
		return;
	}

	tree.parentNode.removeChild(tree);
}

function injectFileTree(): void {
	if (!repositoryFileTreeEnabled) {
		return;
	}
	const { repoURI, isCodePage } = github.parseURL();

	if (!repoURI || !isCodePage) {
		hideFileTree();
		return;
	}
	let mount = document.getElementById("sourcegraph-file-tree") as HTMLElement;
	if (mount) {
		return;
	}

	mount = document.createElement("nav");
	mount.id = "sourcegraph-file-tree";
	mount.style.zIndex = "100002";
	mount.style.position = "fixed";
	mount.style.top = "0px";
	mount.style.display = "flex";
	mount.style.width = "280px";
	mount.style.height = "100%";
	mount.style.left = "0px";
	mount.style.background = "rgb(36, 41, 46)";

	const gitHubState = github.getGitHubState(window.location.href);
	if (!gitHubState) {
		return;
	}
	backend.listAllFiles(repoURI, gitHubState.rev || "").then(resp => {
		const treeData = buildFileTree(resp);
		if (document.querySelector(".octotree")) {
			chrome.storage.sync.set({ repositoryFileTreeEnabled: false });
			hideFileTree();
			return;
		}
		chrome.storage.sync.get(items => {
			const toggled = items.treeViewToggled === undefined ? true : items.treeViewToggled;
			render(<TreeViewer onToggled={treeViewToggled} toggled={toggled} onSelected={handleSelected} treeData={treeData} parentRef={mount} uri={repoURI} />, mount);
			document.body.appendChild(mount);
			updateTreeViewLayout(toggled);
			const opt = {
				onDrag: function(__: any, $el: any, newWidth: number): boolean {
					if (newWidth < 280) {
						newWidth = 280;
					}
					$el.width(newWidth);
					updateMarginForWidth(true);
					return false;
				},
				resizeWidth: true,
				resizeHeight: false,
				resizeWidthFrom: "right",
				handleSelector: ".splitter",
			};
			$(mount).resizable(opt);
		});
	});
}

function treeViewToggled(toggled: boolean): void {
	eventLogger.logFileTreeToggleClicked({ toggled: toggled });
	updateTreeViewLayout(toggled);
	chrome.storage.sync.set({ treeViewToggled: toggled });
}

function updateMarginForWidth(toggled: boolean): void {
	const fileTree = document.getElementById("sourcegraph-file-tree");
	if (!fileTree) {
		document.body.style.marginLeft = "0px";
		return;
	}
	const repoContent = document.querySelector(".repository-content") as HTMLElement;
	if (!repoContent) {
		document.body.style.marginLeft = "280px";
		return;
	}
	const widthDiff = window.innerWidth - repoContent.clientWidth;
	document.body.style.marginLeft = (widthDiff / 2 > fileTree.clientWidth || !toggled) ? "0px" : `${fileTree.clientWidth}px`;
}

function updateTreeViewLayout(toggled: boolean): void {
	const parent = document.getElementById("sourcegraph-file-tree");
	if (!parent) {
		return;
	}
	if (!toggled) {
		parent.style.height = "54px";
		parent.style.width = "45px";
		document.body.style.marginLeft = "0px";
	} else {
		parent.style.height = "100%";
		parent.style.width = "280px";
		updateMarginForWidth(toggled);
	}
	selectTreeNodeForURL();
}

function handleSelected(path: string, newTab: boolean): void {
	const gitHubState = github.getGitHubState(window.location.href);
	if (!gitHubState) {
		return;
	}
	// Check if the item is already selected and the same path - happens on popstate.
	const tree = $(".jstree").jstree(true);
	if (!tree) {
		return;
	}
	// Do not update URL to the same URL if the item is selected and we are on the page.
	const selected = tree.get_selected();
	if (selected && selected[0] === gitHubState["path"]) {
		return;
	}

	eventLogger.logFileTreeItemClicked({ repo: gitHubState.repo });
	const url = `https://github.com/${gitHubState.owner}/${gitHubState.repo}/blob/${gitHubState.rev || "master"}/${path}`;
	if (newTab) {
		window.open(url, "_blank");
		selectTreeNodeForURL();
		return;
	}

	$.pjax.defaults.timeout = 0;
	$.pjax({
		url,
		container: "#js-repo-pjax-container, .context-loader-container, [data-pjax-container]",
	});
}

function selectTreeNodeForURL(): void {
	const gitHubState = github.getGitHubState(window.location.href);
	if (!gitHubState || !gitHubState["path"]) {
		$(".jstree").jstree("deselect_all");
		return;
	}

	const tree = $(".jstree").jstree(true);
	if (!tree) {
		return;
	}

	const selected = tree.get_selected();
	if (selected && (selected[0] === gitHubState["path"])) {
		return;
	}
	$(".jstree").jstree("deselect_all");
	tree.select_node(gitHubState["path"]);
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
		addBlobAnnotator(file as HTMLElement, mount);
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
