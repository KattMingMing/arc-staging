import CloseIcon from '@sourcegraph/icons/lib/Close'
import ListIcon from '@sourcegraph/icons/lib/List'
import * as React from 'react'
import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
import { switchMap } from 'rxjs/operators/switchMap'
import { Subject } from 'rxjs/Subject'
import { Subscription } from 'rxjs/Subscription'
import { queryGraphQL } from '../backend/graphql'
import { makeRepoURI } from '../repo'
import { Tree } from '../tree/Tree'
import { memoizeObservable } from '../util/memoize'
import { Resizable } from './Resizable'
import { Tab, Tabs } from './Tabs'

const fetchTree = memoizeObservable(
    (args: { repoPath: string; commitID: string }): Observable<string[]> =>
        queryGraphQL(
            `
                query FileTree($repoPath: String!, $commitID: String!) {
                    repository(uri: $repoPath) {
                        commit(rev: $commitID) {
                            tree(recursive: true) {
                                files {
                                    path
                                }
                            }
                        }
                    }
                }
            `,
            args
        ).pipe(
            map(({ data, errors }) => {
                if (
                    !data ||
                    !data.repository ||
                    !data.repository.commit ||
                    !data.repository.commit.tree ||
                    !data.repository.commit.tree.files
                ) {
                    throw new Error('could not fetch file tree data.')
                }
                return data.repository.commit.tree.files.map(file => (file as any).path)
            })
        ),
    makeRepoURI
)

const showSymbols = localStorage.getItem('symbols') !== null

type SidebarTabID = 'files' | 'symbols'

interface Props {
    repoID: any
    repoPath: string
    rev: string | undefined
    commitID: string
    filePath: string
    defaultBranch: string
    className: string
}

interface State {
    loading: boolean
    error?: string

    showSidebar: boolean

    /**
     * All file paths in the repository.
     */
    files?: string[]
}

/**
 * The sidebar for a specific repo revision that shows the list of files and directories.
 */
export class RepoRevSidebar extends React.PureComponent<Props, State> {
    private static LAST_TAB_STORAGE_KEY = 'repo-rev-sidebar-last-tab'
    private static HIDDEN_STORAGE_KEY = 'repo-rev-sidebar-hidden'

    private static TABS: Tab<SidebarTabID>[] = ([
        { id: 'files', label: 'Files' },
        { id: 'symbols', label: 'Symbols' },
    ] as Tab<SidebarTabID>[]).slice(0, showSymbols ? 2 : 1)

    public state: State = {
        loading: true,
        showSidebar: localStorage.getItem(RepoRevSidebar.HIDDEN_STORAGE_KEY) === 'true',
    }

    private specChanges = new Subject<{ repoPath: string; commitID: string }>()
    private subscriptions = new Subscription()

    public componentDidMount(): void {
        // Fetch repository revision.
        this.subscriptions.add(
            this.specChanges
                .pipe(switchMap(({ repoPath, commitID }) => fetchTree({ repoPath, commitID })))
                .subscribe(
                    files => this.setState({ files, loading: false }),
                    err => this.setState({ error: err.message })
                )
        )
        this.specChanges.next({ repoPath: this.props.repoPath, commitID: this.props.commitID })
    }

    public componentWillReceiveProps(props: Props): void {
        if (props.repoPath !== this.props.repoPath || props.commitID !== this.props.commitID) {
            this.specChanges.next({ repoPath: props.repoPath, commitID: props.commitID })
        }
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        if (this.state.loading) {
            return null
        }
        if (!this.state.showSidebar) {
            return (
                <button
                    type="button"
                    className={`btn btn-icon repo-rev-sidebar-toggle ${this.props.className}-toggle`}
                    onClick={this.onSidebarToggle}
                    data-tooltip="Show sidebar"
                >
                    <span style={{ position: 'absolute', top: '6px', left: '6px' }}>
                        <ListIcon />
                    </span>
                </button>
            )
        }

        return (
            <Resizable
                className="repo-rev-container__sidebar-resizable"
                handlePosition="right"
                storageKey="repo-rev-sidebar"
                defaultSize={256 /* px */}
                element={
                    <Tabs
                        tabs={RepoRevSidebar.TABS}
                        storageKey={RepoRevSidebar.LAST_TAB_STORAGE_KEY}
                        tabBarEndFragment={
                            // tslint:disable-next-line
                            <span style={{ width: '100%', textAlign: 'right' }}>
                                <button
                                    onClick={this.onSidebarToggle}
                                    className={`tab-btn sg-icon`}
                                    data-tooltip="Close"
                                    style={{ width: 17, height: 17 }}
                                >
                                    <CloseIcon style={{ width: 17, height: 17, color: 'white' }} />
                                </button>
                            </span>
                        }
                        id="explorer"
                        className={`repo-rev-sidebar ${this.props.className} ${this.state.showSidebar
                            ? `repo-rev-sidebar--open ${this.props.className}--open`
                            : ''} ${showSymbols ? '' : 'repo-rev-sidebar--no-symbols'}`}
                        tabClassName="repo-rev-sidebar__tab"
                    >
                        {this.state.files && (
                            <Tree
                                key="files"
                                repoPath={this.props.repoPath}
                                rev={this.props.commitID}
                                scrollRootSelector="#explorer"
                                selectedPath={this.props.filePath || ''}
                                paths={this.state.files}
                            />
                        )}
                    </Tabs>
                }
            />
        )
    }

    private onSidebarToggle = () => {
        if (!this.state.showSidebar) {
            localStorage.setItem(RepoRevSidebar.HIDDEN_STORAGE_KEY, 'true')
        } else {
            localStorage.removeItem(RepoRevSidebar.HIDDEN_STORAGE_KEY)
        }
        this.setState(state => ({ showSidebar: !state.showSidebar }))
    }
}
