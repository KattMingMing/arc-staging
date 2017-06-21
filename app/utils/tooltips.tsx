import * as marked from "marked";
import { style } from "typestyle";
import * as styles from "../github/styles";
import { getModeFromExtension, getPlatformName } from "../utils";
import { eventLogger, searchEnabled, sourcegraphUrl } from "../utils/context";
import { fetchJumpURL } from "./lsp";
import { getTooltipEventProperties, store, TooltipState } from "./store";

import { highlightBlock } from "highlight.js";

let tooltip: HTMLElement;
let loadingTooltip: HTMLElement;
let tooltipActions: HTMLElement;
let j2dAction: HTMLAnchorElement;
let findRefsAction: HTMLAnchorElement;
let searchAction: HTMLAnchorElement;
let moreContext: HTMLElement;

/**
 * createTooltips initializes the DOM elements used for the hover
 * tooltip and "Loading..." text indicator, adding the former
 * to the DOM (but hidden). It is idempotent.
 */
export function createTooltips(): void {
	if (tooltip) {
		return; // idempotence
	}

	tooltip = document.createElement("DIV");
	tooltip.className = style(styles.tooltip as any);
	tooltip.classList.add("sg-tooltip");
	tooltip.style.visibility = "hidden";
	document.body.appendChild(tooltip);

	loadingTooltip = document.createElement("DIV");
	loadingTooltip.appendChild(document.createTextNode("Loading..."));

	tooltipActions = document.createElement("DIV");
	tooltipActions.className = style(styles.tooltipActions as any);

	moreContext = document.createElement("DIV");
	moreContext.className = style(styles.tooltipMoreActions as any);
	moreContext.appendChild(document.createTextNode("Click for more actions"));

	j2dAction = document.createElement("A") as HTMLAnchorElement;
	j2dAction.appendChild(document.createTextNode("Go to Def"));
	j2dAction.className = `${style(styles.tooltipAction as any)} btn btn-sm BtnGroup-item`;
	j2dAction.onclick = (e) => {
		e.preventDefault();
		const { data, context } = store.getValue();
		if (data && context && context.coords && context.path && context.repoRevSpec) {
			fetchJumpURL(context.coords.char, context.path, context.coords.line, context.repoRevSpec)
				.then((defUrl) => {
					eventLogger.logJumpToDef({ ...getTooltipEventProperties(data, context), hasResolvedJ2D: Boolean(defUrl) });
					if (defUrl) {
						chrome.runtime.sendMessage({ type: "openSourcegraphTab", url: defUrl }, (opened) => {
							if (!opened) {
								window.open(defUrl, "_blank");
							}
						});
					}
				});
		}
	};

	findRefsAction = document.createElement("A") as HTMLAnchorElement;
	findRefsAction.appendChild(document.createTextNode("Find Refs"));
	findRefsAction.className = `${style(styles.tooltipAction as any)} btn btn-sm BtnGroup-item`;
	findRefsAction.onclick = (e) => {
		e.preventDefault();
		const { data, context } = store.getValue();
		if (data && context && context.coords && context.path && context.repoRevSpec) {
			const url = `${sourcegraphUrl}/${context.repoRevSpec.repoURI}@${context.repoRevSpec.rev}/-/blob/${context.path}?utm_source=${getPlatformName()}#L${context.coords.line}:${context.coords.char}$references`;
			chrome.runtime.sendMessage({ type: "openSourcegraphTab", url: url }, (opened) => {
				if (!opened) {
					window.open(url, "_blank");
				}
			});
		}
	};

	searchAction = document.createElement("A") as HTMLAnchorElement;
	searchAction.appendChild(document.createTextNode("Search"));
	searchAction.className = `${style(styles.tooltipAction as any)} btn btn-sm BtnGroup-item`;
	searchAction.onclick = (e) => {
		e.preventDefault();
		const searchText = store.getValue().context && store.getValue().context!.selectedText ?
			store.getValue().context!.selectedText! :
			store.getValue().target!.textContent!;
		if (!searchEnabled) {
			const { data, context } = store.getValue();
			if (data && context && context.repoRevSpec) {
				const url = `${sourcegraphUrl}/${context.repoRevSpec.repoURI}@${context.repoRevSpec.rev}?q=${encodeURIComponent(searchText)}&utm_source=${getPlatformName()}`;
				chrome.runtime.sendMessage({ type: "openSourcegraphTab", url: url }, (opened) => {
					if (!opened) {
						window.open(url, "_blank");
					}
				});
				return;
			}
		}

		const searchForm = document.querySelector(".js-site-search-form") as HTMLFormElement;
		const searchInput = document.querySelector(".js-site-search-field") as HTMLInputElement;
		scroll(0, 0);
		searchInput.value = ""; // just in case
		searchInput.style.color = "black";
		searchInput.style.backgroundColor = "rgba(239, 232, 147, 0.84)";
		const { data, context } = store.getValue();
		if (data && context) {
			eventLogger.logSearch(getTooltipEventProperties(data, context));
		}
		searchInput.value = searchText;
		searchForm.submit();
	};

	tooltipActions.appendChild(j2dAction);
	tooltipActions.appendChild(findRefsAction);
	tooltipActions.appendChild(searchAction);
}

function constructBaseTooltip(): void {
	tooltip.appendChild(loadingTooltip);
	tooltip.appendChild(moreContext);
	tooltip.appendChild(tooltipActions);
}

/**
 * hideTooltip makes the tooltip on the DOM invisible.
 */
export function hideTooltip(): void {
	if (!tooltip) {
		return;
	}

	while (tooltip.firstChild) {
		tooltip.removeChild(tooltip.firstChild);
	}
	tooltip.style.visibility = "hidden"; // prevent black dot of empty content
}

/**
 * updateTooltip displays the appropriate tooltip given current state (and may hide
 * the tooltip if no text is available).
 */
function updateTooltip(state: TooltipState): void {
	hideTooltip(); // hide before updating tooltip text

	const { target, data, docked, context } = state;

	if (!target) {
		// no target to show hover for; tooltip is hidden
		return;
	}
	if (!data) {
		// no data; bail
		return;
	}
	if (!context) {
		// no context; bail
		return;
	}

	constructBaseTooltip();
	loadingTooltip.style.display = data.loading ? "block" : "none";
	moreContext.style.display = docked || data.loading ? "none" : "flex";
	tooltipActions.style.display = docked ? "flex" : "none";

	if (context && context.selectedText) {
		j2dAction.style.display = "none";
		findRefsAction.style.display = "none";
	} else {
		j2dAction.style.display = "block";
		findRefsAction.style.display = "block";
	}

	j2dAction.href = data.j2dUrl ? data.j2dUrl : "";

	if (data && context && context.coords && context.path && context.repoRevSpec) {
		findRefsAction.href = `${sourcegraphUrl}/${context.repoRevSpec.repoURI}@${context.repoRevSpec.rev}/-/blob/${context.path}?utm_source=${getPlatformName()}#L${context.coords.line}:${context.coords.char}$references`;
	} else {
		findRefsAction.href = "";
	}

	const searchText = context!.selectedText ? context!.selectedText! : target!.textContent!;
	if (searchText) {
		searchAction.href = `${sourcegraphUrl}/${context.repoRevSpec.repoURI}@${context.repoRevSpec.rev}/-/blob/${context.path}?utm_source=${getPlatformName()}&q=${searchText}`;
	} else {
		searchAction.href = "";
	}

	if (!data.loading) {
		loadingTooltip.style.visibility = "hidden";

		if (!data.title) {
			// no tooltip text / search context; tooltip is hidden
			return;
		}

		const tooltipText = document.createElement("DIV");
		tooltipText.className = `${style(styles.tooltipTitle as any)} ${getModeFromExtension(context.path)}`;
		tooltipText.appendChild(document.createTextNode(data.title));
		tooltip.insertBefore(tooltipText, moreContext);
		highlightBlock(tooltipText);

		if (data.doc) {
			const tooltipDoc = document.createElement("DIV");
			tooltipDoc.className = style(styles.tooltipDoc as any);
			tooltipDoc.innerHTML = marked(data.doc, { gfm: true, breaks: true, sanitize: true });
			tooltip.insertBefore(tooltipDoc, moreContext);
		}
	} else {
		loadingTooltip.style.visibility = "visible";
	}

	// Anchor it horizontally, prior to rendering to account for wrapping
	// changes to vertical height if the tooltip is at the edge of the viewport.
	const targetBound = target.getBoundingClientRect();
	tooltip.style.left = (targetBound.left + window.scrollX) + "px";

	// Anchor the tooltip vertically.
	const tooltipBound = tooltip.getBoundingClientRect();
	tooltip.style.top = (targetBound.top - (tooltipBound.height + 5) + window.scrollY) + "px";

	// Make it all visible to the user.
	tooltip.style.visibility = "visible";
}

store.subscribe(updateTooltip);
