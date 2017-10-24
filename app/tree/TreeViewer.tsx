import * as React from 'react'
import * as github from '../github/util'
import { eventLogger } from '../util/context'
import { TreeNode } from './index'
import { ReactTree } from './ReactTree'
import { TreeHeader } from './TreeHeader'

interface Props {
    uri: string
    rev: string
    parentRef: HTMLElement
    treeData: TreeNode[]
    onSelected: (url: string, tab: boolean) => void
    onToggled?: (toggled: boolean) => void
    toggled: boolean
}

interface State {
    toggled: boolean
}

export class TreeViewer extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            toggled: this.props.toggled,
        }
    }

    public componentDidMount(): void {
        document.addEventListener('keydown', this.handleKeyDown)
    }

    public componentWillUnmount(): void {
        document.removeEventListener('keydown', this.handleKeyDown)
    }

    public render(): JSX.Element | null {
        const gitHubState = github.getGitHubState(window.location.href)
        if (!gitHubState || !this.props.treeData || document.querySelector('.octotree')) {
            return null
        }
        if (this.props.onToggled) {
            this.props.onToggled(this.state.toggled)
        }
        return (
            <div className={`sg-tree__container ${this.state.toggled ? 'sg-tree__container--toggled' : ''}`}>
                <div className='sg-tree__splitter' />
                <TreeHeader toggled={this.state.toggled} uri={this.props.uri} rev={this.props.rev} onClick={this.toggleTreeViewer} />
                <ReactTree
                    onSelected={this.handleSelection}
                    plugins={['wholerow']}
                    core={{ force_text: true, dblclick_toggle: false, multiple: false, worker: false, data: this.props.treeData }}
                />
            </div>
        )
    }

    private toggleTreeViewer = () => {
        eventLogger.logFileTreeToggleClicked({ toggled: !this.state.toggled })
        if (this.props.onToggled) {
            this.props.onToggled(!this.state.toggled)
        }
        this.setState({
            ...this.state, toggled: !this.state.toggled,
        })
    }

    private handleSelection = (path: string, tab: boolean) => {
        const url = `https://${this.props.uri}/blob/${this.props.rev}/${path}`
        this.props.onSelected(url, tab)
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        if (event.altKey && event.code === 'KeyT') {
            this.toggleTreeViewer()
        }
    }
}
