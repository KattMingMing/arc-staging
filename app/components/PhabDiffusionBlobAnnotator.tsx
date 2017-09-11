import * as backend from "app/backend";
import { DiffusionProps, PhabBlobAnnotator, SourcegraphButton } from "app/components/PhabBlobAnnotator";
import * as phabricator from "app/phabricator/util";
import * as utils from "app/util";
import { CodeCell, OpenInSourcegraphProps } from "app/util/types";

export class PhabDiffusionBlobAnnotator extends PhabBlobAnnotator<DiffusionProps> {
	constructor(props: DiffusionProps) {
		super(props);
	}

	addAnnotations(): void {
		this.applyAnnotationsIfResolvedRev(this.props.repoURI, false, this.props.rev);
	}

	getEventLoggerProps(): any {
		return {
			repo: this.props.repoURI,
			path: this.props.path,
			language: this.fileExtension,
		};
	}

	callResolveRevs(): void {
		this.resolveRevs(this.props.repoURI, this.props.rev);
	}

	getCodeCells(_: boolean): CodeCell[] {
		const table = this.getTable();
		if (!table) {
			return [];
		}
		return phabricator.getCodeCellsForAnnotation(table);
	}

	render(): JSX.Element | null {
		const DIFFUSION_CLASSES = "button grey has-icon msl phui-header-action-link";
		if (!this.state.resolvedRevs[backend.cacheKey(this.props.repoURI, this.props.rev)]) {
			return null;
		}
		const props: OpenInSourcegraphProps = {
			repoUri: this.props.repoURI,
			rev: this.props.rev,
			path: this.props.path,
		};
		return SourcegraphButton(
			utils.getOpenInSourcegraphUrl(props),
			DIFFUSION_CLASSES,
			this.getFileOpenCallback,
		);
	}
}
