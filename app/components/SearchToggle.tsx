import * as github from "app/github/util";
import { getPlatformName } from "app/util";
import { getAssetURL } from "app/util/assets";
import { eventLogger, sourcegraphUrl } from "app/util/context";
import { insertAfter } from "app/util/dom";

const SOURCEGRAPH_SEARCH_TOGGLE_ID = "sourcegraph-search-toggle";
const SCOPED_REPO_SEARCH_CLASS = ".header-search.scoped-search";

const ENABLED_HOVER_TEXT = "Disable search on Sourcegraph";
const DISABLED_HOVER_TEXT = "Enable search on Sourcegraph";

export function injectRepositorySearchToggle(): void {
	if (canRenderRepositorySearch()) {
		chrome.storage.sync.get(items => {
			sourcegraphSearchToggle(items.sourcegraphRepoSearchToggled);
		});
	}
}

function sourcegraphSearchToggle(toggled: boolean): void {
	if (document.getElementById(SOURCEGRAPH_SEARCH_TOGGLE_ID)) {
		return;
	}

	const formContainer = scopedRepoSearchFormContainer();
	if (!formContainer) {
		return;
	}

	const labelInput = document.querySelector(".form-control.header-search-input") as HTMLInputElement;
	const wrapper = document.querySelector(".form-control.header-search-wrapper");
	if (labelInput) {
		formContainer.style.minWidth = "340px";
		labelInput.onfocus = function(): void {
			if (wrapper) {
				wrapper.classList.remove("focus");
			}
		};

		const icon = document.createElement("img");
		icon.src = getAssetURL("sourcegraph-mark.svg");
		icon.style.display = "block";
		icon.style.margin = "auto";
		icon.style.width = "22px";
		icon.style.height = "22px";
		icon.style.opacity = toggled ? "1.0" : "0.5";

		const a = document.createElement("a");
		a.id = "hover-tooltip";
		a.className = "tooltipped";
		a.setAttribute("aria-label", toggled ? ENABLED_HOVER_TEXT : DISABLED_HOVER_TEXT);
		a.appendChild(icon);

		const container = document.createElement("div");
		container.style.cursor = "pointer";
		container.onclick = function(): void {
			toggled = !toggled;
			eventLogger.logSourcegraphRepoSearchToggled({ toggled });
			chrome.storage.sync.set({ sourcegraphRepoSearchToggled: toggled });
			a.setAttribute("aria-label", toggled ? ENABLED_HOVER_TEXT : DISABLED_HOVER_TEXT);
			icon.style.opacity = toggled ? "1.0" : "0.5";
		};
		container.id = SOURCEGRAPH_SEARCH_TOGGLE_ID;
		container.className = "header-search-scope no-underline";

		container.appendChild(a);
		insertAfter(container, labelInput);
		const form = document.querySelector(".js-site-search-form") as HTMLFormElement;
		if (form) {
			form.onsubmit = () => {
				if (toggled && scopedRepoSearchFormContainer()) {
					const searchQuery =  encodeURIComponent(labelInput.value);
					const linkProps = getSourcegraphURLProps(searchQuery);
					if (linkProps) {
						eventLogger.logSourcegraphRepoSearchSubmitted({ ...linkProps, query: searchQuery });
						window.open(linkProps.url, "_blank");
					}
				}
			};
		}
	}
}

function scopedRepoSearchFormContainer(): HTMLElement | null {
	return document.querySelector(SCOPED_REPO_SEARCH_CLASS) as HTMLElement;
}

function canRenderRepositorySearch(): boolean {
	return Boolean(document.querySelector(".header-search-scope"));
}

function getSourcegraphURLProps(query: string): { url: string, repo: string, rev: string | undefined } | undefined {
	const { uri, rev } = github.parseURL();
	if (uri) {
		let url = `${sourcegraphUrl}/${uri}`;
		if (rev) {
			url = `${url}@${rev}`;
		}
		return { url: `${url}?q=${query}&utm_source=${getPlatformName()}`, repo: uri, rev };
	}
}
