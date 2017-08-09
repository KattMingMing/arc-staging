import { OpenOnSourcegraph } from "app/components/OpenOnSourcegraph";
import * as github from "app/github/util";
import { eventLogger, sourcegraphUrl } from "app/util/context";
import { GitHubBlobUrl, GitHubMode, GitHubPullUrl, GitHubRepositoryUrl } from "app/util/types";
import * as React from "react";

interface State {
	resolvedRevs?: {
		head: string,
		base: string,
	};
}

export class ContextualSourcegraphButton extends React.Component<{}, State> {
	constructor() {
		super();
		this.state = {
			resolvedRevs: undefined,
		};
	}

	open(url: string, mode: GitHubMode): void {
		const { uri, rev } = github.parseURL();
		const props = { repo: uri, mode: rev, url };
		if (!url || !url.length && mode === GitHubMode.PullRequest) {
			this.getPullRequestMergeBaseFromSource();
		}

		switch (mode) {
			case GitHubMode.Repository:
				eventLogger.logViewRepositoryClicked(props);
				break;
			case GitHubMode.PullRequest:
				eventLogger.logViewPullRequestClicked(props);
				break;
			default:
				eventLogger.logOpenOnSourcegraphButtonClicked(props);
				break;
		}
	}

	getPullRequestMergeBaseFromSource(): void {
		fetch(`${window.location.origin}${window.location.pathname}?_pjax=%23js-repo-pjax-container`, { method: "GET" })
			.then(resp => resp.text())
			.then(blob => {
				const resolvedRevs = github.getDeltaRevsFromPageSource(blob);
				if (resolvedRevs) {
					this.setState({
						resolvedRevs,
					});
				}
			});
	}

	openOnSourcegraphProps(state: GitHubBlobUrl | GitHubPullUrl | GitHubRepositoryUrl): { label: string, url: string, ariaLabel?: string } {
		let url = `${sourcegraphUrl}/github.com/${state.owner}/${state.repo}`;
		switch (state.mode) {
			case GitHubMode.PullRequest:
				const deltaRevs = this.state.resolvedRevs || github.getDeltaRevs();
				if (!deltaRevs) {
					this.getPullRequestMergeBaseFromSource();
				} else {
					url = `${url}@${deltaRevs.head}?diff=${deltaRevs.base}&utm_source=chrome-extension`;
				}
				return {
					label: "View Pull Request",
					ariaLabel: "View pull request on Sourcegraph",
					url: url,
				};
			default:
				if (state.rev) {
					url = `${url}@${state.rev}`;
				}
				return {
					label: "View Repository",
					ariaLabel: "View repository on Sourcegraph",
					url: url,
				};
		}
	}

	render(): JSX.Element | null {
		const gitHubState = github.getGitHubState(window.location.href);
		if (!gitHubState) {
			return null;
		}

		const { label, url, ariaLabel } = this.openOnSourcegraphProps(gitHubState);
		const className = ariaLabel ? "btn btn-sm tooltipped tooltipped-s" : "btn btn-sm";
		return <OpenOnSourcegraph url={url} ariaLabel={ariaLabel} label={label} className={className} onClick={() => this.open(url, gitHubState.mode)} />;
	}
}
