import * as React from 'react'
import { BlobAnnotator, ButtonProps } from '../../components/BlobAnnotator'
import { AbsoluteRepoFile, MaybeDiffSpec, PositionSpec } from '../../repo/index'
import { getTableDataCell } from '../../repo/tooltips'
import { getCodeCellsForDifferentialAnnotations } from '../util'

export interface Props extends AbsoluteRepoFile, Partial<PositionSpec> {
    fileElement: HTMLElement
    getTargetLineAndOffset: (
        target: HTMLElement,
        opt: MaybeDiffSpec
    ) => { line: number; character: number; word: string } | undefined
    findElementWithOffset: (
        cell: HTMLElement,
        line: number,
        offset: number,
        opt: MaybeDiffSpec
    ) => HTMLElement | undefined
    getNodeToConvert: (td: HTMLTableDataCellElement) => HTMLElement
    isCommit: boolean
    isPullRequest: boolean
    isBase: boolean
    buttonProps: ButtonProps
}

interface State {
    isSplitDiff: boolean
}

const computeIsSplitDiff = (table: HTMLTableElement) => table.classList.contains('diff-2up')

/**
 * MonitoredBlobAnnotator is used to monitor BlobAnnotators whose code table may change over time.
 * A <a href="https://mdn.io/mutationobserver">MutationObserver</a> is needed because the file/table we
 * are annotating is a part of the phabricator dom and we do not control it in our react DOM. This is primarily needed for
 * switching between unified and split diffs in phabricator.
 *
 * When we notice a new table being added to the blob, meaning the table has changed,
 * a trigger will update the subscriptions in the BlobAnnotator component with the new code table.
 */
export class MonitoredBlobAnnotator extends React.Component<Props, State> {
    private fileElement: HTMLElement
    private observer: MutationObserver

    constructor(props: Props) {
        super(props)

        this.fileElement = props.fileElement
    }

    public componentWillMount(): void {
        this.setState({
            isSplitDiff: computeIsSplitDiff(this.getTableElement()),
        })
    }

    public componentDidMount(): void {
        const table = this.getTableElement()

        this.observer = new MutationObserver(this.mutationObserverCallback)

        this.observer.observe(table.parentNode!, { childList: true })
    }

    public componentWillUnmount(): void {
        this.observer.disconnect()
    }

    public render(): JSX.Element | null {
        if (!this.getTableElement()) {
            // TODO(john): figure out something better to do
            return null
        }

        return (
            <BlobAnnotator
                {...this.props}
                fileElement={this.fileElement}
                isSplitDiff={this.state.isSplitDiff}
                getTableElement={this.getTableElement}
                getCodeCells={this.getCodeCells}
                filterTarget={this.filterTarget}
            />
        )
    }

    private mutationObserverCallback = (records: MutationRecord[]): void => {
        for (const rec of records) {
            for (const n of rec.addedNodes) {
                const maybeTable = n as HTMLElement
                if (maybeTable.tagName === 'TABLE') {
                    this.handleTableUpdated(maybeTable as HTMLTableElement)
                }
            }
        }
    }

    private handleTableUpdated(table: HTMLTableElement): void {
        this.setState({
            isSplitDiff: computeIsSplitDiff(table),
        })
    }

    private getTableElement(): HTMLTableElement {
        return this.fileElement.querySelector('table')! as HTMLTableElement
    }

    private getCodeCells = () => {
        const table = this.getTableElement()
        if (!table) {
            return []
        }
        return getCodeCellsForDifferentialAnnotations(table, this.state.isSplitDiff, this.props.isBase)
    }

    private filterTarget = (target: HTMLElement) => {
        const td = getTableDataCell(target)
        if (!td) {
            return false
        }
        if (this.state.isSplitDiff) {
            if (this.props.isBase) {
                return td.colSpan === 1
            } else {
                return td.colSpan === 2
            }
        }
        if (this.props.isBase) {
            return td.classList.contains('left')
        } else {
            return !td.classList.contains('left')
        }
    }
}
