import { SourcegraphIcon } from "app/components/Icons";
import { openSourcegraphTab } from "app/sourcegraph/util";
import * as React from "react";

export interface Props {
	url: string;
	style?: React.CSSProperties;
	iconStyle?: React.CSSProperties;
	className?: string;
	ariaLabel?: string;
	onClick?: () => void;
}

export class OpenOnSourcegraph extends React.Component<Props, {}> {

	open(): void {
		openSourcegraphTab(this.props.url);
		if (this.props.onClick) {
			this.props.onClick();
		}
	}

	render(): JSX.Element {
		return <a aria-label={this.props.ariaLabel} className={this.props.className} style={this.props.style} onClick={() => this.open()}>
			<SourcegraphIcon style={this.props.iconStyle || { marginTop: "-1px", paddingRight: "4px", fontSize: "19px" }} />
			Sourcegraph
				</a>;
	}
}
