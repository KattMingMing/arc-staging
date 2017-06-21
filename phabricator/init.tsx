import { injectPhabricatorBlobAnnotators } from "app/phabricator/inject";
import { expanderListen, getPhabricatorUsername, metaClickOverride, setupPageLoadListener } from "app/phabricator/util";
import { InPageEventLogger } from "app/tracking/InPageEventLogger";
import { getDomainUsername } from "app/util";
import { eventLogger, phabricatorInstance } from "app/util/context";

// fragile and not great
export function init(): void {
	const phabricatorUsername = getPhabricatorUsername();
	if (phabricatorUsername !== null) {
		(eventLogger as InPageEventLogger).setUserId(getDomainUsername(phabricatorInstance.usernameTrackingPrefix, phabricatorUsername));
	}

	/**
	 * This is the main entry point for the phabricator in-page JavaScript plugin.
	 */
	if (window.localStorage && window.localStorage.SOURCEGRAPH_DISABLED !== "true") {
		document.addEventListener("phabPageLoaded", () => {
			expanderListen();
			metaClickOverride();
			injectModules();
			setTimeout(injectModules, 1000); // extra data may be loaded asynchronously; reapply after timeout
			setTimeout(injectModules, 5000); // extra data may be loaded asynchronously; reapply after timeout
		});
		setupPageLoadListener();
	} else {
		// tslint:disable-next-line
		console.log(`Sourcegraph on Phabricator is disabled because window.localStorage.SOURCEGRAPH_DISABLED is set to ${window.localStorage.SOURCEGRAPH_DISABLED}.`);
	}

	// NOTE: injectModules is idempotent, so safe to call multiple times on the same page.
	function injectModules(): void {
		injectPhabricatorBlobAnnotators();
	}
}
