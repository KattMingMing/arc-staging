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
		"dblclick_toggle": boolean,
	};
	plugins?: string[];
	onChanged: (items: any[]) => void;
}

// based off of: https://github.com/hckhanh/react-tree-es6/blob/master/src/react-tree.js
export class ReactTree extends React.Component<Props, {}> {
	componentDidMount(): void {
		$(ReactDOM.findDOMNode(this))
			.on("changed.jstree", (_: any, data: any): any => {
				if (this.props.onChanged) {
					this.props.onChanged(data.selected.map(
						item => data.instance.get_node(item),
					));
				}
			})
			.on("click", ".jstree-anchor", function (e: any): any {
				$(".jstree").jstree(true).toggle_node(e.target);
			})
			.jstree({
				core: this.props.core,
				plugins: this.props.plugins,
			});
	}

	render(): JSX.Element | null {
		return <div/>;
	}
}
