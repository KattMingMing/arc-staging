import { isFirefoxExtension } from "app/util";

/**
 * Helpers
 */
function getSourcegraphURLInput(): HTMLInputElement {
	return document.getElementById("sourcegraph_url") as HTMLInputElement;
}

function getSourcegraphEnableSearchCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-enable-search") as HTMLInputElement;
}

function getSourcegraphDefaultSearchCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-default-search") as HTMLInputElement;
}

function getSourcegraphURLForm(): HTMLFormElement {
	return document.getElementById("sourcegraph_url_form") as HTMLFormElement;
}

function getSaveButton(): HTMLInputElement {
	return getSourcegraphURLForm().querySelector('input[type="submit"]') as HTMLInputElement;
}

function getSourcegraphSearchContainer(): HTMLElement {
	return document.getElementById("sourcegraph-enable-search-container") as HTMLElement;
}

function syncUIToModel(): void {
	chrome.storage.sync.get((items) => {
		getSourcegraphURLInput().value = items.sourcegraphURL;
		getSourcegraphEnableSearchCheckbox().checked = items.searchEnabled;
		getSourcegraphDefaultSearchCheckbox().checked = items.isDefaultSearch;
	});
}

/**
 * Initialization
 */
chrome.storage.sync.get((items) => {
	if (isFirefoxExtension() && getSourcegraphSearchContainer()) {
		getSourcegraphSearchContainer().style.display = "none";
	}

	if (!items.sourcegraphURL) {
		chrome.storage.sync.set({ sourcegraphURL: "https://sourcegraph.com" });
	}
	if (!items.searchEnabled) {
		chrome.storage.sync.set({ searchEnabled: false });
	}
	if (!items.isDefaultSearch) {
		chrome.storage.sync.set({ isDefaultSearch: false });
	}

	syncUIToModel();
});
getSourcegraphURLInput().focus();

/**
 * Sync storage value to UI
 */
chrome.storage.onChanged.addListener(syncUIToModel);

/**
 * UI listeners
 */

getSourcegraphURLForm().addEventListener("submit", (evt) => {
	evt.preventDefault();

	const val = getSourcegraphURLInput().value;
	chrome.permissions.request({
		origins: [val + "/*"],
	}, (granted) => {
		if (granted) {
			chrome.storage.sync.set({ sourcegraphURL: val });
		} else {
			syncUIToModel();
			// Note: it would be nice to display an alert here with an error, but the alert API doesn't work in the options panel (see https://bugs.chromium.org/p/chromium/issues/detail?id=476350)
		}
	});
});

getSourcegraphURLInput().addEventListener("keydown", (evt) => {
	if (evt.keyCode === 13) {
		evt.preventDefault();
		getSaveButton().click();
	}
});

getSourcegraphEnableSearchCheckbox().addEventListener("click", () => {
	const checkbox = getSourcegraphEnableSearchCheckbox();
	chrome.storage.sync.set({ searchEnabled: checkbox.checked });
});

getSourcegraphDefaultSearchCheckbox().addEventListener("click", () => {
	const checkbox = getSourcegraphDefaultSearchCheckbox();
	chrome.storage.sync.set({ isDefaultSearch: checkbox.checked });
});
