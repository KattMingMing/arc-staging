import { injectPhabricatorBlobAnnotators } from "app/phabricator/inject";
import * as phabricator from "app/phabricator/util";

export function injectPhabricatorApplication(): void {
	// make sure this is called before javelinPierce
	document.addEventListener(phabricator.PHAB_PAGE_LOAD_EVENT_NAME, () => {
		injectModules();
		setTimeout(injectModules, 5000); // extra data may be loaded asynchronously; reapply after timeout
	});
	phabricator.javelinPierce(phabricator.setupPageLoadListener, "body");
	phabricator.javelinPierce(phabricator.expanderListen, "body");
	phabricator.javelinPierce(phabricator.metaClickOverride, "body");
}

function injectModules(): void {
	injectPhabricatorBlobAnnotators();
}
