import * as backend from "app/backend";
import { OpenOnSourcegraph } from "app/components/OpenOnSourcegraph";
import * as github from "app/github/util";
import { addAnnotations, RepoRevSpec } from "app/tooltips";
import * as utils from "app/util";
import { eventLogger } from "app/util/context";
import { CodeCell, GitHubBlobUrl, GitHubMode, OpenInSourcegraphProps } from "app/util/types";
import * as React from "react";

const className = "btn btn-sm tooltipped tooltipped-n";
const buttonStyle = { marginRight: "5px", textDecoration: "none", color: "inherit" };
const iconStyle = { marginTop: "-1px", paddingRight: "4px", fontSize: "18px" };

interface Props {
	headPath: string;
	basePath: string | null;
	repoURI: string;
	fileElement: HTMLElement;
	rev?: string;
}

interface State {
	resolvedRevs: { [key: string]: backend.ResolvedRevResp };
}

export class BlobAnnotator extends React.Component<Props, State> {
	revisionChecker: any;

	// language is determined by the path extension
	fileExtension: string;

	isDelta?: boolean;
	isCommit?: boolean;
	isPullRequest?: boolean;
	isSplitDiff?: boolean;
	isCodePage?: boolean;

	// rev is defined for blob view
	rev?: string;

	// base/head properties are defined for diff views (commit + pull request)
	baseCommitID?: string;
	headCommitID?: string;
	baseRepoURI?: string;
	headRepoURI?: string;

	constructor(props: Props) {
		super(props);
		this.state = {
			resolvedRevs: {},
		};

		this.fileExtension = utils.getPathExtension(props.headPath);

		const { isDelta, isPullRequest, isCommit, isCodePage } = github.parseURL(window.location);
		let { rev } = github.parseURL(window.location);
		const gitHubState = github.getGitHubState(window.location.href);
		// TODO(uforic): Eventually, use gitHubState for everything, but for now, only use it when the branch should have a
		// slash in it to fix that bug
		if (gitHubState && gitHubState.mode === GitHubMode.Blob && (gitHubState as GitHubBlobUrl).rev.indexOf("/") > 0) {
			// correct in case branch has slash in it
			rev = (gitHubState as GitHubBlobUrl).rev;
		}
		this.isDelta = isDelta;
		this.isPullRequest = isPullRequest;
		this.isCommit = isCommit;
		this.isCodePage = isCodePage;
		this.rev = this.props.rev || rev;

		if (this.isDelta) {
			this.isSplitDiff = github.isSplitDiff();
			const deltaRevs = github.getDeltaRevs();
			if (!deltaRevs) {
				console.error("cannot determine deltaRevs");
				return;
			}

			this.baseCommitID = deltaRevs.base;
			this.headCommitID = deltaRevs.head;

			const deltaInfo = github.getDeltaInfo();
			if (!deltaInfo) {
				console.error("cannot determine deltaInfo");
				return;
			}

			this.baseRepoURI = deltaInfo.baseURI;
			this.headRepoURI = deltaInfo.headURI;
		}

		this.resolveRevs();
		this.addAnnotations();
	}

	componentDidMount(): void {
		this.props.fileElement.addEventListener("click", this.clickRefresh);
		// Set a timer to re-check revision data every 10 seconds, for repos that haven't been
		// cloned and revs that haven't been sync'd to Sourcegraph.com.
		// Single-flighted requests / caching prevents spamming the API.
		this.revisionChecker = setInterval(() => this.resolveRevs(), 5000);
	}

	componentWillUnmount(): void {
		if (this.revisionChecker) {
			clearInterval(this.revisionChecker);
		}
		this.props.fileElement.removeEventListener("click", this.clickRefresh);
	}

	componentDidUpdate(): void {
		// Reapply annotations after reducer state changes.
		this.addAnnotations();
	}

	clickRefresh = (): void => {
		// Diff expansion is not synchronous, so we must wait for
		// elements to get added to the DOM before calling into the
		// annotations code. 500ms is arbitrary but seems to work well.
		setTimeout(() => this.addAnnotations(), 500);
	}

	updateResolvedRevs(repo: string, rev?: string): void {
		const key = backend.cacheKey(repo, rev);
		if (this.state.resolvedRevs[key] && this.state.resolvedRevs[key].commitID) {
			return; // nothing to do
		}
		backend.resolveRev(repo, rev).then((resp) => {
			let repoStat;
			if (rev) {
				// Empty rev is checked to determine if the user has access to the repo.
				// Non-empty is checked to determine if Sourcegraph.com is sync'd.
				repoStat = { [repo]: resp };
			}
			this.setState({ resolvedRevs: { ...this.state.resolvedRevs, [key]: resp, ...repoStat } });
		}).catch(() => {
			// NO-OP
		});
	}

	resolveRevs(): void {
		const repoStat = this.state.resolvedRevs[this.props.repoURI];
		if (repoStat && repoStat.notFound) {
			// User doesn't have permission to view repo; no need to fetch.
			return;
		}

		if (this.isDelta) {
			if (this.baseCommitID && this.baseRepoURI) {
				this.updateResolvedRevs(this.baseRepoURI, this.baseCommitID);
			}
			if (this.headCommitID && this.headRepoURI) {
				this.updateResolvedRevs(this.headRepoURI, this.headCommitID);
			}
		} else if (this.rev) {
			this.updateResolvedRevs(this.props.repoURI, this.rev);
		} else {
			console.error("unable to fetch annotations; missing revision data");
		}
	}

	private getCodeCells(isSplitDiff: boolean, repoRevSpec: RepoRevSpec, el: HTMLElement): CodeCell[] {
		// The blob is represented by a table; the first column is the line number,
		// the second is code. Each row is a line of code
		const table = el.querySelector("table");
		if (!table) {
			return [];
		}
		return github.getCodeCellsForAnnotation(table, { isSplitDiff, ...repoRevSpec } as any);
	}

	addAnnotations = (): void => {
		// this check is for either when the blob is collapsed or the dom element is not rendered
		const blobElement = github.tryGetBlobElement(this.props.fileElement);
		if (!blobElement) {
			return;
		}

		/**
		 * applyAnnotationsIfResolvedRev will call addAnnotations if we've established that the repo@rev exists at Sourcegraph
		 */
		const applyAnnotationsIfResolvedRev = (path: string, uri: string, rev?: string, isBase?: boolean) => {
			const resolvedRev = this.state.resolvedRevs[backend.cacheKey(uri, rev)];
			if (resolvedRev && resolvedRev.commitID) {
				const repoRevSpec = { repoURI: uri, rev: resolvedRev.commitID, isDelta: this.isDelta || false, isBase: Boolean(isBase) };
				const cells = this.getCodeCells(this.isSplitDiff || false, repoRevSpec, blobElement);
				addAnnotations(path, repoRevSpec, cells);
			}
		};

		if (this.isDelta) {
			if (this.baseCommitID && this.baseRepoURI) {
				applyAnnotationsIfResolvedRev(this.props.basePath ? this.props.basePath : this.props.headPath, this.baseRepoURI, this.baseCommitID, true);
			}
			if (this.headCommitID && this.headRepoURI) {
				applyAnnotationsIfResolvedRev(this.props.headPath, this.headRepoURI, this.headCommitID, false);
			}
		} else {
			applyAnnotationsIfResolvedRev(this.props.headPath, this.props.repoURI, this.rev, false);
		}
	}

	getEventLoggerProps(): any {
		return {
			repo: this.props.repoURI,
			path: this.props.headPath,
			isPullRequest: this.isPullRequest,
			isCommit: this.isCommit,
			language: this.fileExtension,
			isPrivateRepo: github.isPrivateRepo(),
		};
	}

	render(): JSX.Element | null {
		if (!this.isCodePage && !this.isPullRequest) {
			return null;
		}
		if (!this.isDelta && !Boolean(this.state.resolvedRevs[this.props.repoURI])) {
			return null;
		}
		if (this.isDelta && !Boolean(this.state.resolvedRevs[this.baseRepoURI as string])) {
			return null;
		}
		const resolvedRevs = this.state.resolvedRevs[this.props.repoURI] as backend.ResolvedRevResp;
		// We currently do not support private auth.
		if (resolvedRevs.notFound) {
			return null;
		}

		let props: OpenInSourcegraphProps;
		if (this.isDelta) {
			props = {
				repoUri: this.headRepoURI!,
				path: this.props.headPath,
				rev: this.headCommitID!,
				query: {
					diff: {
						rev: this.baseCommitID || "",
					},
				},
			};
		} else {
			props = {
				repoUri: this.props.repoURI,
				path: this.props.headPath,
				rev: this.rev!,
			};
		}

		return getSourcegraphButton(props, this.getFileOpenCallback);
	}

	getFileOpenCallback = (): void => {
		eventLogger.logOpenFile(this.getEventLoggerProps());
	}

	getAuthFileCallback = (): void => {
		eventLogger.logAuthClicked(this.getEventLoggerProps());
	}
}

function getSourcegraphButton(openProps: OpenInSourcegraphProps, fileCallack: () => void): JSX.Element {
	const callback = fileCallack;
	const ariaLabel = "View file on Sourcegraph";
	const customIconStyle = iconStyle;
	return <div style={{ display: "inline-block" }}>
		<OpenOnSourcegraph label="View File" ariaLabel={ariaLabel} openProps={openProps} className={className} style={buttonStyle} iconStyle={customIconStyle} onClick={() => callback()} />
	</div>;
}
