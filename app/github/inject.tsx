import * as _ from 'lodash'
import * as React from 'react'
import { render } from 'react-dom'
import 'rxjs/add/operator/map'
import { BlobAnnotator } from '../components/BlobAnnotator'
import { ContextualSourcegraphButton } from '../components/ContextualSourcegraphButton'
import { injectRepositorySearchToggle } from '../components/SearchToggle'
import { WithResolvedRev } from '../components/WithResolvedRev'
import { findElementWithOffset, getTargetLineAndOffset, GitHubBlobUrl } from '../github/index'
import { listAllFiles, resolveRev } from '../repo/backend'
import { CodeCell } from '../repo/index'
import { getTableDataCell } from '../repo/tooltips'
import { ExtensionEventLogger } from '../tracking/ExtensionEventLogger'
import { buildFileTree } from '../tree/index'
import { TreeViewer } from '../tree/TreeViewer'
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

const $ = require('jquery')
require('jquery-pjax')
require('jquery-resizable-dom')

const defaultFilterTarget = () => true
const identityFunction = (a: any) => a

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
    inject()
    selectTreeNodeForURL()
}
const injectModulesAfterPjaxNavigation = _.debounce(refreshModules, 200, { leading: true, trailing: true })

export function injectGitHubApplication(marker: HTMLElement): void {
    $.pjax.defaults.maxCacheLength = 0
    $.pjax.defaults.timeout = 0

    document.body.appendChild(marker)
    inject()
    chrome.runtime.sendMessage({ type: 'getIdentity' }, identity => {
        if (identity) {
            const e = eventLogger as ExtensionEventLogger
            e.updatePropsForUser(identity)
        }
    })

    // Add page mutation observer to detect URL changes from PJAX.
    const pageChangeMutationObserver = new (window as any).MutationObserver(injectModulesAfterPjaxNavigation)
    const container = document.getElementById('js-repo-pjax-container')
    if (container) {
        pageChangeMutationObserver.observe(container, {
            childList: true,
        })
    }

    document.addEventListener('DOMContentLoaded', () => {
        console.log('asdfasdfasdfadsf!')
    })

    window.addEventListener(
        'resize',
        _.debounce(
            () => {
                updateMarginForWidth()
            },
            500,
            { trailing: true }
        ),
        true
    )
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
    injectOpenOnSourcegraphButton()
    injectRepositorySearchToggle()
    injectCodeSnippetAnnotator(getCodeCommentContainers(), '.border.rounded-1.my-2', false)
    injectCodeSnippetAnnotator(getRepoCodeSearchContainers(), '.d-inline-block', true)
    injectFileTree()
    progressiveContainerObserver()
}

function hideFileTree(): void {
    const tree = document.getElementById('sourcegraph-file-tree')
    document.body.style.marginLeft = '0px'
    if (!tree || !tree.parentNode) {
        return
    }
    tree.parentNode.removeChild(tree)
}

let isTreeViewToggled = false

function injectFileTree(): void {
    if (!repositoryFileTreeEnabled) {
        return
    }
    const { repoPath, isCodePage } = parseURL()

    if (!repoPath) {
        return
    }
    let mount = document.getElementById('sourcegraph-file-tree') as HTMLElement
    if (mount) {
        selectTreeNodeForURL()
        return
    }

    mount = document.createElement('nav')
    mount.id = 'sourcegraph-file-tree'
    document.body.appendChild(mount)

    const gitHubState = getGitHubState(window.location.href)
    if (!gitHubState) {
        return
    }
    resolveRev({ repoPath, rev: gitHubState.rev || '' })
        .toPromise()
        .then(resolvedRev => {
            let commit = gitHubState.rev
            if (!commit && resolvedRev) {
                commit = resolvedRev
            }
            listAllFiles({ repoPath, commitID: commit || '' }).then(resp => {
                if (resp.length === 0) {
                    return
                }
                const treeData = buildFileTree(
                    `https://com/${gitHubState.owner}/${gitHubState.repoName}/blob/${commit}/`,
                    resp
                )
                if (document.querySelector('.octotree')) {
                    chrome.storage.sync.set({ repositoryFileTreeEnabled: false })
                    hideFileTree()
                    return
                }
                chrome.storage.sync.get(items => {
                    isTreeViewToggled = items.treeViewToggled === undefined ? true : items.treeViewToggled
                    if (!isCodePage) {
                        isTreeViewToggled = false
                    }
                    render(
                        <TreeViewer
                            onToggled={treeViewToggled}
                            toggled={isTreeViewToggled}
                            onSelected={handleSelected}
                            treeData={treeData}
                            parentRef={mount}
                            uri={repoPath}
                            rev={commit!}
                        />,
                        mount
                    )
                    updateTreeViewLayout()
                    selectTreeNodeForURL()
                    const opt = {
                        onDrag(__: any, $el: any, newWidth: number): boolean {
                            if (newWidth < 280) {
                                newWidth = 280
                            }
                            $el.width(newWidth)
                            updateMarginForWidth()
                            return false
                        },
                        resizeWidth: true,
                        resizeHeight: false,
                        resizeWidthFrom: 'right',
                        handleSelector: '.sg-tree__splitter',
                    }
                    $(mount).resizable(opt)
                })
            })
        })
}

function treeViewToggled(toggleState: boolean): void {
    isTreeViewToggled = toggleState
    updateTreeViewLayout()
    selectTreeNodeForURL()
    chrome.storage.sync.set({ treeViewToggled: isTreeViewToggled })
}

function updateMarginForWidth(): void {
    const fileTree = document.getElementById('sourcegraph-file-tree')
    if (!fileTree) {
        document.body.style.marginLeft = '0px'
        return
    }
    const repoContent = document.querySelector('.repository-content') as HTMLElement
    if (!repoContent) {
        document.body.style.marginLeft = '0px'
        return
    }
    const widthDiff = window.innerWidth - repoContent.clientWidth
    document.body.style.marginLeft =
        widthDiff / 2 > fileTree.clientWidth || !isTreeViewToggled ? '0px' : `${fileTree.clientWidth}px`
}

function updateTreeViewLayout(): void {
    const parent = document.getElementById('sourcegraph-file-tree')
    if (!parent) {
        return
    }
    parent.style.zIndex = '100002'
    parent.style.position = 'fixed'
    parent.style.top = '0px'
    parent.style.display = 'flex'
    parent.style.width = '280px'
    parent.style.height = '100%'
    parent.style.left = '0px'
    parent.style.background = 'rgb(36, 41, 46)'
    if (!isTreeViewToggled) {
        parent.style.height = '54px'
        parent.style.width = '45px'
        document.body.style.marginLeft = '0px'
        return
    }
    updateMarginForWidth()
}

function handleSelected(url: string, newTab: boolean): void {
    const gitHubState = getGitHubState(window.location.href)
    if (!gitHubState) {
        return
    }
    // Check if the item is already selected and the same path - happens on popstate.
    const tree = $('.jstree').jstree(true)
    if (!tree) {
        return
    }
    // Do not update URL to the same URL if the item is selected and we are on the page.
    const selected = tree.get_selected()
    if (selected && selected[0] === (gitHubState as any).path) {
        return
    }
    eventLogger.logFileTreeItemClicked({ repo: gitHubState.repoName })
    if (newTab) {
        window.open(url, '_blank')
        selectTreeNodeForURL()
        return
    }
    $.pjax({
        url,
        container: '#js-repo-pjax-container, .context-loader-container, [data-pjax-container]',
    })
}

function selectTreeNodeForURL(): void {
    const tree = $('.jstree').jstree(true)
    if (!tree) {
        return
    }

    const gitHubState = getGitHubState(window.location.href) as GitHubBlobUrl
    if (!gitHubState || !gitHubState.filePath) {
        $('.jstree').jstree('deselect_all')
        return
    }

    const selected = tree.get_selected()
    if (selected && selected[0] === gitHubState.filePath) {
        return
    }
    $('.jstree').jstree('deselect_all')
    tree.select_node(gitHubState.filePath)
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
                filterTarget={defaultFilterTarget}
                getNodeToConvert={identityFunction}
                fileElement={file}
                repoPath={`github.com/${gitHubState.owner}/${gitHubState.repoName}`}
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

const buttonProps = {
    className: 'btn btn-sm tooltipped tooltipped-n',
    style: { marginRight: '5px', textDecoration: 'none', color: 'inherit' },
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

        const mountBase = createBlobAnnotatorMount(file, true)
        if (!mountBase) {
            return
        }

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

        render(
            <WithResolvedRev
                component={BlobAnnotator}
                getTableElement={getTableElement}
                getCodeCells={getCodeCellsBase}
                getTargetLineAndOffset={getTargetLineAndOffset}
                findElementWithOffset={findElementWithOffset}
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
