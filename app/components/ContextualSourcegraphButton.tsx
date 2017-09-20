import { OpenOnSourcegraph } from "app/components/OpenOnSourcegraph";
import * as github from "app/github/util";
import { eventLogger } from "app/util/context";
import { GitHubBlobUrl, GitHubMode, GitHubPullUrl, GitHubRepositoryUrl, OpenInSourcegraphProps } from "app/util/types";
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

	open(mode: GitHubMode): void {
		const { uri, rev } = github.parseURL();
		const props = { repo: uri, mode: rev };

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

	openOnSourcegraphProps(state: GitHubBlobUrl | GitHubPullUrl | GitHubRepositoryUrl): { label: string, openProps: OpenInSourcegraphProps, ariaLabel?: string } {
		const props: OpenInSourcegraphProps = {
			repoUri: `github.com/${state.owner}/${state.repo}`,
			rev: state.rev || "",
		};
		return {
			label: "View Repository",
			ariaLabel: "View repository on Sourcegraph",
			openProps: props,
		};
	}

	render(): JSX.Element | null {
		const gitHubState = github.getGitHubState(window.location.href);
		if (!gitHubState) {
			return null;
		}

		const { label, openProps, ariaLabel } = this.openOnSourcegraphProps(gitHubState);
		const className = ariaLabel ? "btn btn-sm tooltipped tooltipped-s" : "btn btn-sm";
		return <OpenOnSourcegraph openProps={openProps} ariaLabel={ariaLabel} label={label} className={className} onClick={() => this.open(gitHubState.mode)} />;
	}
}
