import { ReactTree } from "app/components/tree/ReactTree";
import * as styles from "app/components/tree/styles/style";
import { TreeHeader } from "app/components/tree/TreeHeader";
import * as github from "app/github/util";
import { TreeNode } from "app/sourcegraph/util";
import * as React from "react";

interface Props {
	uri: string;
	rev: string;
	parentRef: HTMLElement;
	treeData: TreeNode[];
	onSelected: (url: string, tab: boolean) => void;
	onToggled?: (toggled: boolean) => void;
	toggled: boolean;
}

interface State {
	toggled: boolean;
}

export class TreeViewer extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			toggled: this.props.toggled,
		};

		document.addEventListener("keydown", (event: any) => {
			if (event.altKey && event.code === "KeyT") {
				this.toggleTreeViewer();
			}
		});
	}

	toggleTreeViewer(): void {
		if (this.props.onToggled) {
			this.props.onToggled(!this.state.toggled);
		}
		this.setState({
			...this.state, toggled: !this.state.toggled,
		});
	}

	handleSelection(path: string, tab: boolean): void {
		const url = `https://${this.props.uri}/blob/${this.props.rev}/${path}`;
		this.props.onSelected(url, tab);
	}

	render(): JSX.Element | null {
		const gitHubState = github.getGitHubState(window.location.href);
		if (!gitHubState || !this.props.treeData || document.querySelector(".octotree")) {
			return null;
		}

		return (
			<div style={{ ...styles.container, overflow: this.state.toggled ? "auto" : "hidden" }}>
				<div className="splitter" style={styles.splitter as any} />
				<TreeHeader toggled={this.state.toggled} uri={this.props.uri} repo={gitHubState.repo} rev={this.props.rev} onClick={this.toggleTreeViewer.bind(this)} />
				<ReactTree onSelected={this.handleSelection.bind(this)} plugins={["wholerow"]} core={{ force_text: true, dblclick_toggle: false, multiple: false, worker: false, data: this.props.treeData }} />
			</div>
		);
	}
}
