/**
 * set the event logger before anything else proceeds, to avoid logging events before we have it set.
 */
import { ExtensionEventLogger } from "../../app/tracking/ExtensionEventLogger";
import { eventLogger, setEventLogger, setPhabricatorInstance, setSearchEnabled, setSourcegraphUrl } from "../../app/utils/context";

setEventLogger(new ExtensionEventLogger());

import { injectSourcegraph as injectSourcegraphEditor } from "../../app/editor/inject";
import { getDomain } from "../../app/utils";
import { Domain } from "../../app/utils/types";
import { injectBitbucketApplication } from "./inject_bitbucket";
import { injectGitHubApplication } from "./inject_github";
import { injectPhabricatorApplication } from "./inject_phabricator";

import { SGDEV_SOURCEGRAPH_URL, sgDevPhabricatorInstance } from "../../phabricator/sgdev/constants";

const SGDEV_SOURCEGRAPH_URL_BITBUCKET = "http://localhost:3080";

/**
 * Main entry point into browser extension.
 *
 * Depending on the domain, we load one of three different applications.
 */
function injectApplication(loc: Location): void {
	const extensionMarker = document.createElement("div");
	extensionMarker.id = "sourcegraph-app-background";
	extensionMarker.style.display = "none";

	switch (getDomain(loc)) {
		case Domain.GITHUB:
			chrome.storage.sync.get(items => {
				const sgurl = items.sourcegraphURL ? items.sourcegraphURL : "https://sourcegraph.com";
				setSourcegraphUrl(sgurl);
				setSearchEnabled(items.searchEnabled);
				injectGitHubApplication(extensionMarker);
			});
			break;
		case Domain.SGDEV_PHABRICATOR:
			setSourcegraphUrl(SGDEV_SOURCEGRAPH_URL);
			setPhabricatorInstance(sgDevPhabricatorInstance);
			injectPhabricatorApplication();
			break;
		case Domain.SOURCEGRAPH:
			setSourcegraphUrl("https://sourcegraph.com");
			injectSourcergaphCloudApplication(extensionMarker);
			break;
		case Domain.SGDEV_BITBUCKET:
			setSourcegraphUrl(SGDEV_SOURCEGRAPH_URL_BITBUCKET);
			injectBitbucketApplication();
			break;
		default:
			break;
	}
}

function injectSourcergaphCloudApplication(marker: HTMLElement): void {
	window.addEventListener("load", () => {
		document.body.appendChild(marker);
	});

	injectSourcegraphEditor();
	document.addEventListener("sourcegraph:identify", (ev: CustomEvent) => {
		if (ev && ev.detail) {
			(eventLogger as ExtensionEventLogger).updatePropsForUser(ev.detail);
			chrome.runtime.sendMessage({ type: "setIdentity", identity: ev.detail });
		} else {
			console.error("sourcegraph:identify missing details");
		}
	});
}

injectApplication(window.location);
