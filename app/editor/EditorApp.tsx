import { SourcegraphIcon } from "app/components/Icons";
import { parseURL as parseGitHubURL } from "app/github/utils";
import { parseURL as parseSourcegraphURL } from "app/sourcegraph/utils";
import { getDomain } from "app/utils";
import { Domain, ParsedURL } from "app/utils/types";
import * as React from "react";

export class EditorApp extends React.Component<{}, {}> {

	openEditor(): void {
		let url: ParsedURL | undefined;
		switch (getDomain()) {
			case Domain.GITHUB:
				url = parseGitHubURL();
				break;
			case Domain.SOURCEGRAPH:
				url = parseSourcegraphURL();
				break;

		}

		if (!url || !url.uri || !url.path) {
			return;
		}

		let uri = url.uri;
		if (uri.indexOf("github.com/sourcegraph") !== -1) {
			uri = uri.replace(/github.com/, "sourcegraph.com");
		}
		const cmd = `/usr/local/bin/code /Users/rothfels/go/src/${uri}/${url.path}`;
		chrome.runtime.sendMessage({ type: "openEditor", cmd });
	}

	render(): JSX.Element | null {
		if (getDomain(window.location) === Domain.GITHUB) {
			return <div className="btn btn-sm" onClick={() => this.openEditor()}>
				<SourcegraphIcon style={{ marginTop: "-1px", paddingRight: "4px", fontSize: "19px" }} />
				<span style={{ marginRight: "2px" }}>Open in Editor</span>
			</div>;
		}

		return <div onClick={() => this.openEditor()}>
			Open in Editor
		</div>;
	}
}
