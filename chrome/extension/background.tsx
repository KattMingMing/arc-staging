import { TelligentWrapper } from "app/tracking/TelligentWrapper";
import { sourcegraphUrl } from "app/util/context";
import * as bluebird from "bluebird";

let telligentWrapper: TelligentWrapper | null = null;
Promise = (bluebird as any);

function promisifier(method: any): (...args: any[]) => Promise<any> {
	return (...args) => new Promise((resolve) => {
		args.push(resolve);
		method.apply(this, args);
	});
}

function promisifyAll(obj: any, list: string[]): void {
	list.forEach(api => bluebird.promisifyAll(obj[api], { promisifier }));
}

// let chrome extension api support Promise
promisifyAll(chrome.storage, ["local"]);

telligentWrapper = new TelligentWrapper("SourcegraphExtension", "BrowserExtension", true, true);

const application = "com.sourcegraph.browser_ext_host";
let port: any = null;

if (process.env.NODE_ENV === "development") {
	port = chrome.runtime.connectNative(application);
	// port.onMessage.addListener((e) => console.log("port connected", e));
	port.onDisconnect.addListener((e) => {
		console.error("unexpected disconnect", e);
		port = null;
	});
}

chrome.tabs.onUpdated.addListener((tabID, changeInfo) => {
	if (changeInfo.url && changeInfo.url.indexOf("https://sourcegraph.com") !== -1) {
		if (changeInfo.url.indexOf("https://sourcegraph.com/-/editor") === -1) { // let redirect happen first
			chrome.tabs.query({ url: "https://sourcegraph.com/*" }, (tabs) => {
				if (tabs.length > 1 && tabs[0].id !== tabID) {
					chrome.tabs.remove(tabID, () => {
						navigateSourcegraphTab(tabs[0].windowId, tabs[0].id!, changeInfo.url!);
					});
				}
			});
		}
	}
});

function navigateSourcegraphTab(windowID: number, tabID: number, url: string): void {
	chrome.windows.update(windowID, { focused: true }, () => {
		chrome.tabs.update(tabID, { active: true }, () => {
			chrome.tabs.executeScript(tabID, { code: `window.dispatchEvent(new CustomEvent("browser-ext-navigate", {detail: {url: "${url}"}}))` });
		});
	});
}

chrome.runtime.onMessage.addListener((message, _, cb) => {
	switch (message.type) {
		case "setIdentity":
			chrome.storage.local.set({ identity: message.identity });
			return;

		case "getIdentity":
			chrome.storage.local.get("identity", (obj) => {
				const { identity } = obj;
				cb(identity);
			});
			return true;

		case "getSessionToken":
			chrome.cookies.get({ url: sourcegraphUrl, name: "sg-session" }, (sessionToken) => {
				cb(sessionToken ? sessionToken.value : null);
			});
			return true;

		case "openSourcegraphTab":
			chrome.tabs.query({ url: "https://sourcegraph.com/*" }, (tabs) => {
				if (tabs.length > 0) {
					navigateSourcegraphTab(tabs[0].windowId, tabs[0].id!, message.url);
					cb(true);
				} else {
					cb(false);
				}
			});
			return true;

		case "openEditor":
			const msg = { cmd: message.cmd };
			if (port) {
				port.postMessage(msg);
			} else {
				chrome.runtime.sendNativeMessage(application, msg, cb);
			}
			return true;

		case "trackEvent":
			if (telligentWrapper) {
				telligentWrapper.track(message.payload.eventAction, message.payload);
			}
			return;

		case "trackView":

			if (telligentWrapper) {
				telligentWrapper.track("view", message.payload);
			}
			return;

		case "setTrackerUserId":
			if (telligentWrapper) {
				telligentWrapper.setUserId(message.payload);
			}
			return;

		case "setTrackerDeviceId":
			if (telligentWrapper) {
				telligentWrapper.addStaticMetadataObject({ deviceInfo: { TelligentWebDeviceId: message.payload } });
			}
			return;

		case "setTrackerGAClientId":
			if (telligentWrapper) {
				telligentWrapper.addStaticMetadataObject({ deviceInfo: { GAClientId: message.payload } });
			}
			return;
	}
});
