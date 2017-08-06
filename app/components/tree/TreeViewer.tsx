import { ReactTree } from "app/components/tree/ReactTree";
import * as styles from "app/components/tree/styles/style";
import { TreeHeader } from "app/components/tree/TreeHeader";
import * as github from "app/github/util";
import { TreeNode } from "app/sourcegraph/util";
import * as React from "react";
import Resizable from "react-resizable-box";

interface Props {
	uri: string;
	parentRef: HTMLElement;
	treeData: TreeNode[];
	onChanged: (items: any[]) => void;
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

		document.addEventListener ("keydown", (event: any) => {
			if (event.altKey && event.code === "KeyT") {
				this.toggleTreeViewer();
			}
		});
	}

	onResize(_: () => void, __: string, element: HTMLElement): void {
		this.props.parentRef.style.width = element.style.width;
	}

	toggleTreeViewer(): void {
		if (this.props.onToggled) {
			this.props.onToggled(!this.state.toggled);
		}
		this.setState({
			...this.state, toggled: !this.state.toggled,
		});
	}

	render(): JSX.Element | null {
		const gitHubState = github.getGitHubState(window.location.href);
		if (!gitHubState || !this.props.treeData) {
			return null;
		}
		if (!this.state.toggled) {
			return (
				<TreeHeader toggled={this.state.toggled} uri={this.props.uri} repo={gitHubState.repo} rev={gitHubState.rev} onClick={this.toggleTreeViewer.bind(this)}/>
			);
		}
		return (
			<div style={styles.container}>
				<Resizable onResize={this.onResize.bind(this)} className="item" width="280" height="100%" minWidth={280}>
					<TreeHeader toggled={this.state.toggled} uri={this.props.uri} repo={gitHubState.repo} rev={gitHubState.rev} onClick={this.toggleTreeViewer.bind(this)}/>
					<ReactTree onChanged={this.props.onChanged} plugins={["wholerow"]} core={{ dblclick_toggle: false, multiple: false,  worker: false, data: this.props.treeData }} />
				</Resizable>
			</div>
		);
	}
}
