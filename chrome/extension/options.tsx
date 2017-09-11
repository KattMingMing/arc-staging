import { isFirefoxExtension } from "app/util";

/**
 * Helpers
 */
function getSourcegraphURLInput(): HTMLInputElement {
	return document.getElementById("sourcegraph_url") as HTMLInputElement;
}

function getSourcegraphURLForm(): HTMLFormElement {
	return document.getElementById("sourcegraph_url_form") as HTMLFormElement;
}

function getSaveButton(): HTMLInputElement {
	return getSourcegraphURLForm().querySelector('input[type="submit"]') as HTMLInputElement;
}

function getEnableEventTrackingCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-enable-event-tracking") as HTMLInputElement;
}

function getEnableEventTrackingContainer(): HTMLElement {
	return document.getElementById("sourcegraph-event-tracking-container") as HTMLElement;
}

function getRepositorySearchCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-repository-search") as HTMLInputElement;
}

function getFileTreeNavigationCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-file-tree-navigation") as HTMLInputElement;
}

function getSourcegraphEditorOptionsContainer(): HTMLElement {
	return document.getElementById("sourcegraph-editor-container") as HTMLElement;
}

function getOpenInEditorCheckbox(): HTMLInputElement {
	return document.getElementById("sourcegraph-open-in-editor") as HTMLInputElement;
}

function syncUIToModel(): void {
	chrome.storage.sync.get((items) => {
		getSourcegraphURLInput().value = items.sourcegraphURL;
		getEnableEventTrackingCheckbox().checked = getEnableEventTrackingCheckbox() ? items.eventTrackingEnabled : false;
		getRepositorySearchCheckbox().checked = items.repositorySearchEnabled;
		getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled;
		getOpenInEditorCheckbox().checked = items.openInEditorEnabled;
	});
}

/**
 * Initialization
 */
chrome.storage.sync.get((items) => {
	if (!isFirefoxExtension() && getEnableEventTrackingContainer()) {
		getEnableEventTrackingContainer().style.display = "none";
	}
	// Currently hide the ability to set editor features until editor is released.
	getSourcegraphEditorOptionsContainer().style.display = "none";

	if (!items.sourcegraphURL) {
		chrome.storage.sync.set({ sourcegraphURL: "https://sourcegraph.com" });
	}
	if (!items.eventTrackingEnabled) {
		chrome.storage.sync.set({ eventTrackingEnabled: !isFirefoxExtension() });
	}
	if (items.repositorySearchEnabled === undefined) {
		chrome.storage.sync.set({ repositorySearchEnabled: true });
	}
	if (items.repositoryFileTreeEnabled === undefined) {
		chrome.storage.sync.set({ repositoryFileTreeEnabled: true });
	}
	if (!items.openInEditorEnabled) {
		chrome.storage.sync.set({ openInEditorEnabled: false });
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

getEnableEventTrackingCheckbox().addEventListener("click", () => {
	const checkbox = getEnableEventTrackingCheckbox();
	chrome.storage.sync.set({ eventTrackingEnabled: checkbox.checked });
});

getRepositorySearchCheckbox().addEventListener("click", () => {
	const checkbox = getRepositorySearchCheckbox();
	chrome.storage.sync.set({ repositorySearchEnabled: checkbox.checked });
});

getFileTreeNavigationCheckbox().addEventListener("click", () => {
	const checkbox = getFileTreeNavigationCheckbox();
	chrome.storage.sync.set({ repositoryFileTreeEnabled: checkbox.checked });
});

getOpenInEditorCheckbox().addEventListener("click", () => {
	const checkbox = getOpenInEditorCheckbox();
	chrome.storage.sync.set({ openInEditorEnabled: checkbox.checked });
});
