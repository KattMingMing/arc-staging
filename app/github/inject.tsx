import * as React from 'react'
import { render } from 'react-dom'
import { Subject } from 'rxjs/Subject'
import * as runtime from '../../extension/runtime'
import * as storage from '../../extension/storage'
import { Alerts } from '../components/Alerts'
import { BlobAnnotator } from '../components/BlobAnnotator'
import { ContextualSourcegraphButton } from '../components/ContextualSourcegraphButton'
import { OpenPullRequestButton } from '../components/OpenPullRequestButton'
import { injectRepositorySearchToggle } from '../components/SearchToggle'
import { WithResolvedRev } from '../components/WithResolvedRev'
import { findElementWithOffset, getTargetLineAndOffset, GitHubBlobUrl } from '../github/index'
import { CodeCell } from '../repo/index'
import { getTableDataCell, hideTooltip } from '../repo/tooltips'
import { ExtensionEventLogger } from '../tracking/ExtensionEventLogger'
import { RepoRevSidebar } from '../tree/RepoRevSidebar'
import { eventLogger, getPlatformName, repositoryFileTreeEnabled, sourcegraphUrl } from '../util/context'

import {
    createBlobAnnotatorMount,
    getCodeCells,
    getCodeCommentContainers,
    getDeltaFileName,
    getDiffRepoRev,
    getDiffResolvedRev,
    getFileContainers,
    getGitHubState,
    getRepoCodeSearchContainers,
    isDomSplitDiff,
    parseURL,
} from './util'

const defaultFilterTarget = () => true
const identityFunction = (a: any) => a

const buttonProps = {
    className: 'btn btn-sm tooltipped tooltipped-n',
    style: { marginRight: '5px', textDecoration: 'none', color: 'inherit' },
}

function refreshModules(): void {
    for (const el of Array.from(document.getElementsByClassName('sourcegraph-app-annotator'))) {
        el.remove()
    }
    for (const el of Array.from(document.getElementsByClassName('sourcegraph-app-annotator-base'))) {
        el.remove()
    }
    for (const el of Array.from(document.querySelectorAll('.sg-annotated'))) {
        el.classList.remove('sg-annotated')
    }
    hideTooltip()
    inject()
}

window.addEventListener('pjax:end', () => {
    refreshModules()
})

export function injectGitHubApplication(marker: HTMLElement): void {
    document.body.appendChild(marker)
    inject()
    runtime.sendMessage({ type: 'getIdentity' }, identity => {
        if (identity) {
            const e = eventLogger as ExtensionEventLogger
            e.updatePropsForUser(identity)
        }
    })
}

function progressiveContainerObserver(): void {
    const progressiveLoaders = document.getElementsByClassName('diff-progressive-loader')
    // Check that there is a progressive loader that will be removed.
    if (progressiveLoaders.length === 0) {
        return
    }
    const loaders: Element[] = []
    // tslint:disable-next-line
    for (let i = 0; i < progressiveLoaders.length; i++) {
        const element = progressiveLoaders[i]
        loaders.push(element)
    }
    const observer = new MutationObserver(mutations => {
        // tslint:disable-next-line
        mutations.forEach(mutation => {
            const nodes = Array.prototype.slice.call(mutation.removedNodes)
            // tslint:disable-next-line
            nodes.forEach(node => {
                // tslint:disable-next-line
                loaders.forEach(loader => {
                    if (loader === node) {
                        const index = loaders.indexOf(loader)
                        loaders.splice(index)
                        injectBlobAnnotators()
                        if (loaders.length === 0) {
                            observer.disconnect()
                            return
                        }
                    }
                })
            })
        })
    })
    const filebucket = document.getElementById('files_bucket')
    if (!filebucket) {
        return
    }
    observer.observe(filebucket, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
    })
}

function inject(): void {
    injectBlobAnnotators()
    injectServerBanner()
    injectOpenOnSourcegraphButton()
    injectRepositorySearchToggle()
    injectCodeSnippetAnnotator(getCodeCommentContainers(), '.border.rounded-1.my-2', false)
    injectCodeSnippetAnnotator(getRepoCodeSearchContainers(), '.d-inline-block', true)
    injectFileTree()
    progressiveContainerObserver()
    injectOpenPullRequestButton()
}

function hideFileTree(): void {
    const tree = document.getElementById('sourcegraph-file-tree')
    document.body.style.marginLeft = '0px'
    if (!tree || !tree.parentNode) {
        return
    }
    tree.parentNode.removeChild(tree)
}

const specChanges = new Subject<{ repoPath: string; commitID: string }>()

function injectFileTree(): void {
    if (!repositoryFileTreeEnabled) {
        return
    }
    const { repoPath } = parseURL()

    if (!repoPath) {
        return
    }
    const pjaxContainer = document.getElementById('js-repo-pjax-container')
    if (!pjaxContainer) {
        return
    }

    let container = document.getElementById('sourcegraph-file-tree-container') as HTMLElement
    let mount = document.getElementById('sourcegraph-file-tree') as HTMLElement
    if (!mount) {
        mount = document.createElement('div')
        mount.id = 'sourcegraph-file-tree'
        mount.className = 'tree-mount'
        mount.setAttribute('data-pjax', 'true')
        container = document.createElement('div')
        container.id = 'sourcegraph-file-tree-container'
        container.className = 'repo-rev-container'
        mount.appendChild(container)
        pjaxContainer.insertBefore(mount, pjaxContainer.firstElementChild!)
    }

    const gitHubState = getGitHubState(window.location.href)
    if (!gitHubState) {
        return
    }
    if (document.querySelector('.octotree')) {
        storage.setSync({ repositoryFileTreeEnabled: false })
        hideFileTree()
        return
    }
    render(
        <WithResolvedRev
            component={RepoRevSidebar}
            className="repo-rev-container__sidebar"
            repoPath={repoPath}
            rev={gitHubState.rev}
            history={history}
            scrollRootSelector="#explorer"
            selectedPath={gitHubState.filePath}
            filePath={gitHubState.filePath}
            location={window.location}
            defaultBranch={'HEAD'}
        />,
        container
    )
    specChanges.next({ repoPath, commitID: gitHubState.rev || '' })
}

const findTokenCell = (td: HTMLElement, target: HTMLElement) => {
    let curr = target
    while (
        curr.parentElement &&
        (curr.parentElement === td || curr.parentElement.classList.contains('blob-code-inner'))
    ) {
        curr = curr.parentElement
    }
    return curr
}

/**
 * injectCodeSnippetAnnotator annotates the given containers and adds a view file button.
 * @param containers The blob containers that holds the code snippet to be annotated.
 * @param selector The selector of the element to append a "View File" button.
 */
function injectCodeSnippetAnnotator(
    containers: HTMLCollectionOf<HTMLElement>,
    selector: string,
    isRepoSearch: boolean
): void {
    for (const file of Array.from(containers)) {
        const filePathContainer = file.querySelector(selector)
        if (!filePathContainer) {
            continue
        }
        const anchors = file.getElementsByTagName('a')
        let gitHubState: GitHubBlobUrl | undefined
        for (const anchor of Array.from(anchors)) {
            const anchorState = getGitHubState(anchor.href) as GitHubBlobUrl
            if (anchorState) {
                gitHubState = anchorState
                break
            }
        }

        if (!gitHubState || !gitHubState.owner || !gitHubState.repoName || !gitHubState.rev || !gitHubState.filePath) {
            continue
        }
        const mountEl = document.createElement('div')
        mountEl.style.display = 'none'
        mountEl.className = 'sourcegraph-app-annotator'
        filePathContainer.appendChild(mountEl)

        const getTableElement = () => file.querySelector('table')

        const getCodeCellsCb = () => {
            const opt = { isDelta: false }
            const table = getTableElement()
            const cells: CodeCell[] = []
            if (!table) {
                return cells
            }
            return getCodeCells(table, opt)
        }

        render(
            <WithResolvedRev
                component={BlobAnnotator}
                getTableElement={getTableElement}
                getCodeCells={getCodeCellsCb}
                getTargetLineAndOffset={getTargetLineAndOffset}
                findElementWithOffset={findElementWithOffset}
                findTokenCell={findTokenCell}
                filterTarget={defaultFilterTarget}
                getNodeToConvert={identityFunction}
                fileElement={file}
                repoPath={`${window.location.host}/${gitHubState.owner}/${gitHubState.repoName}`}
                rev={gitHubState.rev}
                filePath={gitHubState.filePath}
                isPullRequest={false}
                isSplitDiff={false}
                isCommit={!isRepoSearch}
                isBase={false}
                buttonProps={buttonProps}
            />,
            mountEl
        )
    }
}

function injectServerBanner(): void {
    if (window.localStorage['server-banner-enabled'] !== 'true') {
        return
    }

    const { isPullRequest, repoPath } = parseURL()
    if (!isPullRequest) {
        return
    }
    // Check which files were modified.
    const files = getFileContainers()
    if (!files.length) {
        return
    }

    let mount = document.getElementById('server-alert-mount')
    if (!mount) {
        mount = document.createElement('div')
        mount.id = 'server-alert-mount'
        const container = document.getElementById('partial-discussion-header')
        if (!container) {
            return
        }
        container.appendChild(mount)
    }
    render(<Alerts repoPath={repoPath} />, mount)
}

function injectBlobAnnotators(): void {
    const { repoPath, isDelta, isPullRequest, rev, isCommit, filePath, position } = parseURL()
    if (!filePath && !isDelta) {
        return
    }

    function addBlobAnnotator(file: HTMLElement): void {
        const getTableElement = () => file.querySelector('table')

        if (!isDelta) {
            const mount = createBlobAnnotatorMount(file)
            if (!mount) {
                return
            }

            const getCodeCellsCb = () => {
                const opt = { isDelta: false }
                const table = getTableElement()
                const cells: CodeCell[] = []
                if (!table) {
                    return cells
                }
                return getCodeCells(table, opt)
            }

            render(
                <WithResolvedRev
                    component={BlobAnnotator}
                    getTableElement={getTableElement}
                    getCodeCells={getCodeCellsCb}
                    getTargetLineAndOffset={getTargetLineAndOffset}
                    findElementWithOffset={findElementWithOffset}
                    findTokenCell={findTokenCell}
                    filterTarget={defaultFilterTarget}
                    getNodeToConvert={identityFunction}
                    fileElement={file}
                    repoPath={repoPath}
                    rev={rev}
                    filePath={filePath}
                    isPullRequest={false}
                    isSplitDiff={false}
                    isCommit={false}
                    isBase={false}
                    buttonProps={buttonProps}
                    position={position}
                />,
                mount
            )
            return
        }

        const { headFilePath, baseFilePath } = getDeltaFileName(file)
        if (!headFilePath) {
            console.error('cannot determine file path')
            return
        }

        const isSplitDiff = isDomSplitDiff()
        let baseCommitID: string | undefined
        let headCommitID: string | undefined
        let baseRepoPath: string | undefined
        let headRepoPath: string | undefined
        const deltaRevs = getDiffResolvedRev()
        if (!deltaRevs) {
            console.error('cannot determine deltaRevs')
            return
        }

        baseCommitID = deltaRevs.baseCommitID
        headCommitID = deltaRevs.headCommitID

        const deltaInfo = getDiffRepoRev()
        if (!deltaInfo) {
            console.error('cannot determine deltaInfo')
            return
        }

        baseRepoPath = deltaInfo.baseRepoPath
        headRepoPath = deltaInfo.headRepoPath

        const getCodeCellsDiff = (isBase: boolean) => () => {
            const opt = { isDelta: true, isSplitDiff, isBase }
            const table = getTableElement()
            const cells: CodeCell[] = []
            if (!table) {
                return cells
            }
            return getCodeCells(table, opt)
        }
        const getCodeCellsBase = getCodeCellsDiff(true)
        const getCodeCellsHead = getCodeCellsDiff(false)

        const filterTarget = (isBase: boolean, isSplitDiff: boolean) => (target: HTMLElement) => {
            const td = getTableDataCell(target)
            if (!td) {
                return false
            }

            if (isSplitDiff) {
                if (td.classList.contains('empty-cell')) {
                    return false
                }
                // Check the relative position of the <td> element to determine if it is
                // on the left or right.
                const previousEl = td.previousElementSibling
                const isLeft = previousEl === td.parentElement!.firstElementChild
                if (isBase) {
                    return isLeft
                } else {
                    return !isLeft
                }
            }

            if (td.classList.contains('blob-code-deletion') && !isBase) {
                return false
            }
            if (td.classList.contains('blob-code-deletion') && isBase) {
                return true
            }
            if (td.classList.contains('blob-code-addition') && isBase) {
                return false
            }
            if (td.classList.contains('blob-code-addition') && !isBase) {
                return true
            }
            if (isBase) {
                return false
            }
            return true
        }

        const getNodeToConvert = (td: HTMLTableDataCellElement) => {
            if (!td.classList.contains('blob-code-inner')) {
                return td.querySelector('.blob-code-inner') as HTMLElement
            }
            return td
        }

        const mountHead = createBlobAnnotatorMount(file)
        if (!mountHead) {
            return
        }

        render(
            <WithResolvedRev
                component={BlobAnnotator}
                getTableElement={getTableElement}
                getCodeCells={getCodeCellsHead}
                getTargetLineAndOffset={getTargetLineAndOffset}
                findElementWithOffset={findElementWithOffset}
                findTokenCell={findTokenCell}
                filterTarget={filterTarget(false, isSplitDiff)}
                getNodeToConvert={getNodeToConvert}
                fileElement={file}
                repoPath={headRepoPath}
                rev={headCommitID}
                filePath={headFilePath}
                isPullRequest={isPullRequest}
                isSplitDiff={isSplitDiff}
                isCommit={isCommit}
                isBase={false}
                buttonProps={buttonProps}
            />,
            mountHead
        )

        const mountBase = createBlobAnnotatorMount(file, true)
        if (!mountBase) {
            return
        }

        render(
            <WithResolvedRev
                component={BlobAnnotator}
                getTableElement={getTableElement}
                getCodeCells={getCodeCellsBase}
                getTargetLineAndOffset={getTargetLineAndOffset}
                findElementWithOffset={findElementWithOffset}
                findTokenCell={findTokenCell}
                filterTarget={filterTarget(true, isSplitDiff)}
                getNodeToConvert={getNodeToConvert}
                fileElement={file}
                repoPath={baseRepoPath}
                rev={baseCommitID}
                filePath={baseFilePath || headFilePath}
                isPullRequest={isPullRequest}
                isSplitDiff={isSplitDiff}
                isCommit={isCommit}
                isBase={true}
                buttonProps={buttonProps}
            />,
            mountBase
        )
    }

    const files = getFileContainers()
    for (const file of Array.from(files)) {
        addBlobAnnotator(file as HTMLElement)
    }
}

/**
 * Appends an Open on Sourcegraph button to the GitHub DOM.
 * The button is only rendered on a repo homepage after the "find file" button.
 */
function injectOpenOnSourcegraphButton(): void {
    const container = createOpenOnSourcegraphIfNotExists()
    const pageheadActions = document.querySelector('.pagehead-actions')
    if (!pageheadActions || !pageheadActions.children.length) {
        return
    }
    pageheadActions.insertBefore(container, pageheadActions.children[0])
    if (container) {
        const url = openOnSourcegraphURL()
        if (url) {
            render(<ContextualSourcegraphButton />, container)
        }
    }
}

const OPEN_ON_SOURCEGRAPH_ID = 'open-on-sourcegraph'

function createOpenOnSourcegraphIfNotExists(): HTMLElement {
    let container = document.getElementById(OPEN_ON_SOURCEGRAPH_ID)
    if (container) {
        container.remove()
    }

    container = document.createElement('li')
    container.id = OPEN_ON_SOURCEGRAPH_ID
    return container
}

function openOnSourcegraphURL(): string | undefined {
    const { repoPath, rev } = parseURL()
    if (repoPath) {
        const url = `${sourcegraphUrl}/${repoPath}`
        if (rev) {
            return `${url}@${rev}`
        }
        return `${url}?utm_source=${getPlatformName()}`
    }
}

function injectOpenPullRequestButton(): void {
    const container = createOpenPullRequestButton()
    const headerActions = document.querySelector('.gh-header-actions')
    if (!headerActions) {
        return
    }
    headerActions.insertBefore(container, headerActions.firstChild)
    render(<OpenPullRequestButton />, container)
}

const OPEN_PULL_REQUEST_BUTTON_ID = 'sg-editor-open-pull-request'

function createOpenPullRequestButton(): HTMLElement {
    let container = document.getElementById(OPEN_PULL_REQUEST_BUTTON_ID)
    if (container) {
        container.remove()
    }
    container = document.createElement('span')
    container.id = OPEN_PULL_REQUEST_BUTTON_ID
    return container
}
