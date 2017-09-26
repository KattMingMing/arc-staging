import * as backend from "app/backend";
import { OpenOnSourcegraph } from "app/components/OpenOnSourcegraph";
import * as github from "app/github/util";
import { eventLogger } from "app/util/context";
import { GitHubBlobUrl, GitHubMode, GitHubPullUrl, GitHubRepositoryUrl, OpenInSourcegraphProps } from "app/util/types";
import * as React from "react";

interface State {
	resolvedRevs: { [key: string]: backend.ResolvedRevResp };
}

export class ContextualSourcegraphButton extends React.Component<{}, State> {
	constructor() {
		super();
		this.state = {
			resolvedRevs: {},
		};

		this.resolveRevs();
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

	resolveRevs(): void {
		const { uri, rev } = github.parseURL();
		if (!uri) {
			return;
		}
		const key = backend.cacheKey(uri, rev);
		if (this.state.resolvedRevs[key] && this.state.resolvedRevs[key].commitID) {
			return; // nothing to do
		}
		backend.resolveRev(uri, rev).then((resp) => {
			let repoStat;
			if (rev) {
				// Empty rev is checked to determine if the user has access to the repo.
				// Non-empty is checked to determine if Sourcegraph.com is sync'd.
				repoStat = { [uri]: resp };
			}
			this.setState({ resolvedRevs: { ...this.state.resolvedRevs, [key]: resp, ...repoStat } });
		}).catch(() => {
			// NO-OP
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
		const { uri, rev } = github.parseURL();
		if (!uri) {
			return null;
		}
		const key = backend.cacheKey(uri, rev);
		if (!this.state.resolvedRevs[key] || this.state.resolvedRevs[key].notFound) {
			return null;
		}

		const { label, openProps, ariaLabel } = this.openOnSourcegraphProps(gitHubState);
		const className = ariaLabel ? "btn btn-sm tooltipped tooltipped-s" : "btn btn-sm";
		return <OpenOnSourcegraph openProps={openProps} ariaLabel={ariaLabel} label={label} className={className} onClick={() => this.open(gitHubState.mode)} />;
	}
}
