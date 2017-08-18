import "app/components/tree/styles/jstree.css";
import "app/components/tree/styles/jstreeDark.css";

import * as React from "react";
import * as ReactDOM from "react-dom";

const $ = require("jquery");
import "jstree";

interface Props {
	core: {
		data: any[],
		worker: boolean,
		multiple: boolean,
		force_text: boolean,
		"dblclick_toggle": boolean,
	};
	plugins?: string[];
	onSelected: (url: string, tab: boolean) => void;
}

// based off of: https://github.com/hckhanh/react-tree-es6/blob/master/src/react-tree.js
export class ReactTree extends React.Component<Props, {}> {
	componentDidMount(): void {
		$(ReactDOM.findDOMNode(this))
			.on("click", ".jstree-anchor", function(e: any): any {
				$(".jstree").jstree(true).toggle_node(e.target);
			})
			.on("click", this.onClick.bind(this))
			.jstree({
				core: this.props.core,
				plugins: this.props.plugins,
			});
	}

	onClick(e: any): void {
		const target = e.target as HTMLElement;
		if (!target || e.which === 2) {
			return;
		}
		// Check parent element because we use whole row selection.
		const parentElement = target.parentElement;
		if (!parentElement || !parentElement.classList.contains("jstree-leaf")) {
			return;
		}
		if (!parentElement.id) {
			return;
		}
		const newTab = e.shiftKey || e.ctrlKey || e.metaKey;
		if (this.props.onSelected) {
			this.props.onSelected(parentElement.id, newTab);
		}
	}

	render(): JSX.Element | null {
		return <div />;
	}
}
