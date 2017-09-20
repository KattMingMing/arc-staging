import { ShowFileTree, ToggleFileTree } from "app/components/Icons";
import * as styles from "app/components/tree/styles/style";
import { getPlatformName } from "app/util";
import { sourcegraphUrl } from "app/util/context";
import * as React from "react";

interface Props {
	uri: string;
	rev: string | undefined;
	onClick: () => void;
	toggled: boolean;
}

export class TreeHeader extends React.Component<Props, {}> {

	render(): JSX.Element | null {
		const { uri, rev } = this.props;
		let url = `${sourcegraphUrl}/${uri}`;
		if (rev) {
			url = `${url}@${rev}`;
		}
		url = `${url}?utm_source=${getPlatformName()}`;

		return <div style={styles.header as any} >
			<div style={styles.headerBox as any}>
				{this.props.toggled ? <ToggleFileTree style={styles.headerToggle} onClick={this.props.onClick} /> : <ShowFileTree style={styles.headerToggle} onClick={this.props.onClick} />}
			</div>
		</div>;
	}
}
