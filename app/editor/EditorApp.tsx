import { SourcegraphIcon } from "app/components/Icons";
import { parseURL as parseGitHubURL } from "app/github/util";
import { parseURL as parseSourcegraphURL } from "app/sourcegraph/util";
import { getDomain } from "app/util";
import { Domain, ParsedURL } from "app/util/types";
import * as React from "react";

export class EditorApp extends React.Component<ParsedURL, {}> {

	openEditor(): void {
		let uri = this.props.uri;
		let path = this.props.path;
		if (!uri || !path) {
			let parsedUrl: ParsedURL;
			switch (getDomain()) {
				case Domain.SOURCEGRAPH:
					parsedUrl = parseSourcegraphURL();
					break;

				case Domain.GITHUB:
					parsedUrl = parseGitHubURL();
					break;

				default:
					return;
			}
			uri = parsedUrl.uri;
			path = parsedUrl.path;
		}
		if (!uri || !path) {
			return;
		}

		if (uri.indexOf("github.com/sourcegraph") !== -1) {
			uri = uri.replace(/github.com/, "sourcegraph.com");
		}
		const cmd = `/usr/local/bin/code /Users/rothfels/go/src/${uri}/${path}`;
		chrome.runtime.sendMessage({ type: "openEditor", cmd });
	}

	render(): JSX.Element | null {
		if (getDomain() === Domain.GITHUB) {
			return <a className="btn btn-sm" onClick={() => this.openEditor()}>
				<SourcegraphIcon style={{ marginTop: "-1px", paddingRight: "4px", fontSize: "19px" }} />
				<span style={{ marginRight: "2px" }}>Open in Editor</span>
			</a>;
		}

		return <div onClick={() => this.openEditor()}>
			Open in Editor
		</div>;
	}
}
