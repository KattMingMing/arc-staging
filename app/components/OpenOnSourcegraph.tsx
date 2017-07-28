import { SourcegraphIcon } from "app/components/Icons";
import { openSourcegraphTab } from "app/sourcegraph/util";
import { isMouseEventWithModifierKey } from "app/util/dom";
import * as React from "react";

export interface Props {
	url: string;
	style?: React.CSSProperties;
	iconStyle?: React.CSSProperties;
	className?: string;
	ariaLabel?: string;
	onClick?: (e: any) => void;
	label: string;
}

export class OpenOnSourcegraph extends React.Component<Props, {}> {

	open(e: any): void {
		openSourcegraphTab(this.props.url, isMouseEventWithModifierKey(e));
		if (this.props.onClick) {
			this.props.onClick(e);
		}
	}

	render(): JSX.Element {
		return <a aria-label={this.props.ariaLabel} className={this.props.className} style={this.props.style} onClick={(e) => this.open(e)}>
			<SourcegraphIcon style={this.props.iconStyle || { marginTop: "-1px", paddingRight: "4px", fontSize: "19px" }} />
				{this.props.label}
				</a>;
	}
}
