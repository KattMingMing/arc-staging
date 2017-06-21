import * as utils from ".";
import { CodeCell, GitHubBlobUrl, GitHubMode, GitHubPullUrl } from "./types";

function invariant(cond: any): void {
	if (!cond) {
		console.error("github invariant exception");
		throw new Error("github invariant exception");
	}
}

/**
 * getFileContainers returns the elements on the page which should be marked
 * up with tooltips & links:
 *
 * 1. blob view: a single file
 * 2. commit view: one or more file diffs
 * 3. PR conversation view: snippets with inline comments
 * 4. PR unified/split view: one or more file diffs
 */
export function getFileContainers(): HTMLCollectionOf<HTMLElement> {
	return document.getElementsByClassName("file") as HTMLCollectionOf<HTMLElement>;
}

/**
 * tryGetBlobElement returns the element within a file container which contains
 * source code. The blob element contains a <table> element which has line
 * numbers, source code, and (possibly) diff expanders. If the file container
 * is collapsed (e.g. for large files) then null is returned
 */
export function tryGetBlobElement(fileContainer: HTMLElement): HTMLElement | null {
	return fileContainer.querySelector(".blob-wrapper") as HTMLElement | null;
}

/**
 * getBlobElement returns the <table> element containing line numbers and
 * source code (including for unified/split diffs).
 */
export function getCodeTable(fileContainer: HTMLElement): HTMLTableElement {
	const blob = tryGetBlobElement(fileContainer);
	invariant(blob);
	const table = (blob as HTMLElement).querySelector("table");
	invariant(table);
	return table as HTMLTableElement;
}

/**
 * createBlobAnnotatorMount creates a <div> element and adds it to the DOM
 * where the BlobAnnotator component should be mounted.
 */
export function createBlobAnnotatorMount(fileContainer: HTMLElement): HTMLElement | null {
	if (isInlineCommentContainer(fileContainer)) {
		return null;
	}

	const existingMount = fileContainer.querySelector(".sourcegraph-app-annotator");
	if (existingMount) {
		existingMount.remove();
	}

	const mountEl = document.createElement("div");
	mountEl.style.display = "inline-block";
	mountEl.className = "sourcegraph-app-annotator";

	const fileActions = fileContainer.querySelector(".file-actions");
	if (!fileActions) {
		// E.g. snippets on the PR conversation view.
		return null;
	}

	const buttonGroup = fileActions.querySelector(".BtnGroup");
	if (buttonGroup && buttonGroup.parentNode) { // blob view
		// mountEl.style.cssFloat = "none";
		buttonGroup.parentNode.insertBefore(mountEl, buttonGroup);
	} else { // commit & pull request view
		const note = fileContainer.querySelector(".show-file-notes");
		if (!note || !note.parentNode) {
			throw new Error("cannot locate BlobAnnotator injection site");
		}
		note.parentNode.insertBefore(mountEl, note.nextSibling);
	}

	return mountEl;
}

/**
 * isInlineCommentContainer returns true if the element provided
 * is an inline review comment. It is how you detect if a table cell
 * contains source code or a comment.
 */
export function isInlineCommentContainer(file: HTMLElement): boolean {
	return file.classList.contains("inline-review-comment");
}

/**
 * isPrivateRepo returns true of the current document is for a private
 * repository URI.
 */
export function isPrivateRepo(): boolean {
	return document.getElementsByClassName("label label-private v-align-middle").length > 0;
}

/**
 * getDeltaFileName returns the path of the file container. It assumes
 * the file container is for a diff (i.e. a commit or pull request view).
 */
export function getDeltaFileName(container: HTMLElement): { headFilePath: string, baseFilePath: string | null } {
	const info = container.querySelector(".file-info") as HTMLElement;
	invariant(info);

	if (info.title) {
		// for PR conversation snippets
		return getPathNamesFromElement(info);
	} else {
		const link = info.querySelector("a") as HTMLElement;
		invariant(link);
		invariant(link.title);
		return getPathNamesFromElement(link);
	}
}

function getPathNamesFromElement(element: HTMLElement): { headFilePath: string, baseFilePath: string | null } {
	const elements = element.title.split(" → ");
	if (elements.length > 1) {
		return { headFilePath: elements[1], baseFilePath: elements[0] };
	}
	return { headFilePath: elements[0], baseFilePath: null };
}

/**
 * isSplitDiff returns if the current view shows diffs with split (vs. unified) view.
 */
export function isSplitDiff(): boolean {
	const { isDelta, isPullRequest } = utils.parseURL(window.location);
	if (!isDelta) {
		return false;
	}

	if (isPullRequest) {
		const headerBar = document.getElementsByClassName("float-right pr-review-tools");
		if (!headerBar || headerBar.length !== 1) {
			return false;
		}

		const diffToggles = headerBar[0].getElementsByClassName("BtnGroup");
		invariant(diffToggles && diffToggles.length === 1);

		const disabledToggle = diffToggles[0].getElementsByTagName("A")[0] as HTMLAnchorElement;
		return disabledToggle && !disabledToggle.href.includes("diff=split");
	} else { // delta for a commit view
		const headerBar = document.getElementsByClassName("details-collapse table-of-contents js-details-container");
		if (!headerBar || headerBar.length !== 1) {
			return false;
		}

		const diffToggles = headerBar[0].getElementsByClassName("BtnGroup float-right");
		invariant(diffToggles && diffToggles.length === 1);

		const selectedToggle = diffToggles[0].querySelector(".selected") as HTMLAnchorElement;
		return selectedToggle && selectedToggle.href.includes("diff=split");
	}
}

// TODO(john): combine getDeltaRevs and getDeltaInfo.

export interface DeltaRevs {
	base: string;
	head: string;
}

/**
 * getDeltaRevs returns the base and head revision SHA, or null for non-diff views.
 */
export function getDeltaRevs(): DeltaRevs | null {
	const { isDelta, isCommit, isPullRequest } = utils.parseURL(window.location);
	if (!isDelta) {
		return null;
	}

	let base = "";
	let head = "";
	const fetchContainers = document.getElementsByClassName("js-socket-channel js-updatable-content js-pull-refresh-on-pjax");
	if (isPullRequest) {
		if (fetchContainers && fetchContainers.length === 1) {
			for (let i = 0; i < fetchContainers.length; ++i) {
				// for conversation view of pull request
				const el = fetchContainers[i] as HTMLElement;
				const url = el.getAttribute("data-url");
				if (!url) {
					continue;
				}

				const urlSplit = url.split("?");
				invariant(urlSplit.length === 2);
				const query = urlSplit[1];
				const querySplit = query.split("&");
				for (const kv of querySplit) {
					const kvSplit = kv.split("=");
					const k = kvSplit[0];
					const v = kvSplit[1];
					if (k === "base_commit_oid") {
						base = v;
					}
					if (k === "end_commit_oid") {
						head = v;
					}
				}
			}

		} else {
			// Last-ditch: look for inline comment form input which has base/head on it.
			const baseInput = document.querySelector(`input[name="comparison_start_oid"]`);
			if (baseInput) {
				base = (baseInput as HTMLInputElement).value;
			}
			const headInput = document.querySelector(`input[name="comparison_end_oid"]`);
			if (headInput) {
				head = (headInput as HTMLInputElement).value;
			}
		}
	} else if (isCommit) {
		const shaContainer = document.querySelectorAll(".sha-block");
		if (shaContainer && shaContainer.length === 2) {
			const baseShaEl = shaContainer[0].querySelector("a");
			if (baseShaEl) {
				// e.g "https://github.com/gorilla/mux/commit/0b13a922203ebdbfd236c818efcd5ed46097d690"
				base = baseShaEl.href.split("/").slice(-1)[0];
			}
			const headShaEl = shaContainer[1].querySelector("span.sha") as HTMLElement;
			if (headShaEl) {
				head = headShaEl.innerHTML;
			}
		}
	}

	if (base === "" || head === "") {
		return null;
	}
	return { base, head };
}

export interface DeltaInfo {
	baseBranch: string;
	baseURI: string;
	headBranch: string;
	headURI: string;
}

/**
 * getDeltaInfo returns the base and head branches & URIs, or null for non-diff views.
 */
export function getDeltaInfo(): DeltaInfo | null {
	const { repoURI, isDelta, isPullRequest, isCommit } = utils.parseURL(window.location);
	if (!isDelta) {
		return null;
	}

	invariant(repoURI);

	let baseBranch = "";
	let headBranch = "";
	let baseURI = "";
	let headURI = "";
	if (isPullRequest) {
		const branches = document.querySelectorAll(".commit-ref,.current-branch") as HTMLCollectionOf<HTMLElement>;
		baseBranch = branches[0].title;
		headBranch = branches[1].title;

		if (baseBranch.includes(":")) {
			const baseSplit = baseBranch.split(":");
			baseBranch = baseSplit[1];
			baseURI = `github.com/${baseSplit[0]}`;
		} else {
			baseBranch = repoURI as string;
		}
		if (headBranch.includes(":")) {
			const headSplit = headBranch.split(":");
			headBranch = headSplit[1];
			headURI = `github.com/${headSplit[0]}`;
		} else {
			headURI = repoURI as string;
		}

	} else if (isCommit) {
		let branchEl = document.querySelector("li.branch") as HTMLElement;
		if (branchEl) {
			branchEl = branchEl.querySelector("a") as HTMLElement;
		}
		if (branchEl) {
			baseBranch = branchEl.innerHTML;
			headBranch = branchEl.innerHTML;
		}
		baseURI = repoURI as string;
		headURI = repoURI as string;
	}

	if (baseBranch === "" || headBranch === "" || baseURI === "" || headURI === "") {
		return null;
	}
	return { baseBranch, headBranch, baseURI, headURI };
}

/**
 * getCodeCellsForAnnotation code cells which should be annotated
 */
export function getCodeCellsForAnnotation(table: HTMLTableElement, opt: { isDelta: boolean, isSplitDiff: boolean; isBase: boolean }): CodeCell[] {
	const cells: CodeCell[] = [];
	for (let i = 0; i < table.rows.length; ++i) {
		const row = table.rows[i];

		// Inline comments can be on
		if (row.className.includes("inline-comments")) {
			continue;
		}

		let line: number; // line number of the current line
		let codeCell: HTMLTableDataCellElement; // the actual cell that has code inside; each row contains multiple columns
		let isAddition: boolean | undefined;
		let isDeletion: boolean | undefined;
		if (opt.isDelta) {
			if ((opt.isSplitDiff && row.cells.length !== 4) || (!opt.isSplitDiff && row.cells.length !== 3)) {
				// for "diff expander" lines
				continue;
			}

			let lineCell: HTMLTableDataCellElement;
			if (opt.isSplitDiff) {
				lineCell = opt.isBase ? row.cells[0] : row.cells[2];
			} else {
				lineCell = opt.isBase ? row.cells[0] : row.cells[1];
			}

			if (opt.isSplitDiff) {
				codeCell = opt.isBase ? row.cells[1] : row.cells[3];
			} else {
				codeCell = row.cells[2];
			}

			if (!codeCell) {
				console.error(`missing code cell at row ${i}`, table);
				continue;
			}

			if (codeCell.className.includes("blob-code-empty")) {
				// for split diffs, this class represents "empty" ranges for one side of the diff
				continue;
			}

			isAddition = codeCell.className.includes("blob-code-addition");
			isDeletion = codeCell.className.includes("blob-code-deletion");

			// additions / deletions should be annotated with the correct revision;
			// unmodified parts should only be annotated once;
			// head is preferred over base for unmodified parts because of the ?w=1 parameter
			if (!isAddition && !isDeletion && opt.isBase && !opt.isSplitDiff) {
				continue;
			}
			if (isDeletion && !opt.isBase) {
				continue;
			}
			if (isAddition && opt.isBase) {
				continue;
			}

			const lineData = lineCell.getAttribute("data-line-number") as string;
			if (lineData === "...") {
				// row before line "1" on diff views
				continue;
			}

			line = parseInt(lineData, 10);
		} else {
			line = parseInt(row.cells[0].getAttribute("data-line-number") as string, 10);
			codeCell = row.cells[1];
		}

		const innerCode = codeCell.querySelector(".blob-code-inner"); // ignore extraneous inner elements, like "comment" button on diff views
		cells.push({
			cell: (innerCode || codeCell) as HTMLElement,
			eventHandler: codeCell, // allways the TD element
			line,
			isAddition,
			isDeletion,
		});
	}

	return cells;
}

const GITHUB_BLOB_REGEX = /^(https?):\/\/(github.com)\/([A-Za-z0-9_]+)\/([A-Za-z0-9-]+)\/blob\/([^#]*)(#L[0-9]+)?/i;
const GITHUB_PULL_REGEX = /^(https?):\/\/(github.com)\/([A-Za-z0-9_]+)\/([A-Za-z0-9-]+)\/pull\/([0-9]+)(\/(commits|files))?/i;
const COMMIT_HASH_REGEX = /^([0-9a-f]{40})/i;
export function getGitHubState(url: string): GitHubBlobUrl | GitHubPullUrl | null {
	const blobMatch = GITHUB_BLOB_REGEX.exec(url);
	if (blobMatch) {
		const match = {
			protocol: blobMatch[1],
			hostname: blobMatch[2],
			org: blobMatch[3],
			repo: blobMatch[4],
			revAndPath: blobMatch[5],
			lineNumber: blobMatch[6],
		};
		const rev = getRevOrBranch(match.revAndPath);
		if (!rev) {
			return null;
		}
		const path = match.revAndPath.replace(rev + "/", "");
		return {
			mode: GitHubMode.Blob,
			owner: match.org,
			repo: match.repo,
			revAndPath: match.revAndPath,
			lineNumber: match.lineNumber,
			rev: rev,
			path: path,
		};
	}
	const pullMatch = GITHUB_PULL_REGEX.exec(url);
	if (pullMatch) {
		const match = {
			protocol: pullMatch[1],
			hostname: pullMatch[2],
			org: pullMatch[3],
			repo: pullMatch[4],
			id: pullMatch[5],
			view: pullMatch[7],
		};
		const numId: number = parseInt(match.id, 10);
		if (isNaN(numId)) {
			console.error(`match.id ${match.id} is parsing to NaN`);
			return null;
		}
		return {
			mode: GitHubMode.PullRequest,
			repo: match.repo,
			owner: match.org,
			view: match.view,
			id: numId,
		};
	}
	return null;
}

function getBranchName(): string | null {
	const branchButtons = document.getElementsByClassName("btn btn-sm select-menu-button js-menu-target css-truncate");
	if (branchButtons.length === 0) {
		return null;
	}
	// if the branch is a long name, it appears in the title of this element
	// I'm not kidding, so dumb...
	if ((branchButtons[0] as HTMLElement).title) {
		return (branchButtons[0] as HTMLElement).title;
	}
	const innerButtonEls = (branchButtons[0] as HTMLElement).getElementsByClassName("js-select-button css-truncate-target");
	if (innerButtonEls.length === 0) {
		return null;
	}
	// otherwise, the branch name is fully rendered in the button
	return (innerButtonEls[0] as HTMLElement).innerText as string;
}

function getRevOrBranch(revAndPath: string): string | null {
	const matchesCommit = COMMIT_HASH_REGEX.exec(revAndPath);
	if (matchesCommit) {
		return matchesCommit[1].substring(0, 40);
	}
	const branch = getBranchName();
	if (!branch) {
		return null;
	}
	if (!revAndPath.startsWith(branch)) {
		console.error(`branch and path is ${revAndPath}, and branch is ${branch}`);
		return null;
	}
	return branch;
}
