import * as React from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import 'rxjs/add/operator/toPromise'
import { BlobAnnotator } from '../components/BlobAnnotator'
import { fetchBlobContentLines, resolveRev } from '../repo/backend'
import { getTableDataCell } from '../repo/tooltips'
import { ConduitDiffChange, getDiffDetailsFromConduit, searchForCommitID } from './backend'
import {
    ChangeState,
    DifferentialState,
    DiffusionState,
    findElementWithOffset,
    getTargetLineAndOffset,
    PhabricatorMode,
    RevisionState,
} from './index'
import {
    getCodeCellsForAnnotation,
    getCodeCellsForDifferentialAnnotations,
    getFilepathFromFile,
    getPhabricatorState,
    normalizeRepoPath,
    tryGetBlobElement,
} from './util'

const diffusionButtonProps = {
    className: 'button grey has-icon msl phui-header-action-link',
    iconStyle: { marginTop: '-1px', paddingRight: '4px', fontSize: '18px', height: '.8em', width: '.8em' },
    style: {},
}

const differentialButtonProps = {
    className: 'button grey has-icon msl',
    iconStyle: { marginTop: '-1px', paddingRight: '4px', fontSize: '18px', height: '.8em', width: '.8em' },
    style: {},
}

const noFilterFunction = () => true
const identityFunction = (a: any) => a

const findTokenCell = (td: HTMLElement, target: HTMLElement) => {
    let curr = target
    while (curr.parentElement && curr.parentElement !== td) {
        curr = curr.parentElement
    }
    return curr
}

/**
 * injectPhabricatorBlobAnnotators finds file blocks on the dom that sould be annotated, and adds blob annotators to them.
 */
export async function injectPhabricatorBlobAnnotators(): Promise<void> {
    const state = await getPhabricatorState(window.location)
    if (!state) {
        return
    }
    switch (state.mode) {
        case PhabricatorMode.Diffusion:
            return injectDiffusion(state as DiffusionState)

        case PhabricatorMode.Differential:
        case PhabricatorMode.Revision:
        case PhabricatorMode.Change:
            return injectChangeset(state)
    }
}

function createBlobAnnotatorMount(
    fileContainer: HTMLElement,
    buttonClass: string,
    isBase: boolean
): HTMLElement | null {
    const className = 'sourcegraph-app-annotator' + (isBase ? '-base' : '')
    const existingMount = fileContainer.querySelector('.' + className)
    if (existingMount) {
        // Make this function idempotent; no need to create a mount twice.
        return existingMount as HTMLElement
    }

    const mountEl = document.createElement('div')
    mountEl.style.display = 'inline-block'
    mountEl.className = className

    const actionLinks = fileContainer.querySelector(buttonClass)
    if (!actionLinks) {
        return null
    }
    actionLinks.appendChild(mountEl)
    return mountEl
}

interface ResolveDiffOpt {
    repoPath: string
    filePath: string
    differentialID: number
    diffID: number
    leftDiffID?: number
    isBase: boolean
    useDiffForBase: boolean // indicates whether the base should use the diff commit
    useBaseForDiff: boolean // indicates whether the diff should use the base commit
}

interface ResolvedDiff {
    commitID: string
    stagingRepoPath?: string
}

function monitorFileContainers(
    fileClassName: string,
    tableContainerClassName: string,
    handler: (file: HTMLElement, table: HTMLTableElement, force: boolean) => void
): void {
    const files = document.getElementsByClassName(fileClassName) as HTMLCollectionOf<HTMLElement>

    for (const file of Array.from(files)) {
        const container = file.querySelector(`.${tableContainerClassName}`)

        if (!container) {
            continue
        }

        const observer = new MutationObserver((records: MutationRecord[]): void => {
            for (const rec of records) {
                for (const n of rec.addedNodes) {
                    const maybeTable = n as HTMLElement
                    if (maybeTable.tagName === 'TABLE') {
                        handler(file, maybeTable as HTMLTableElement, true)
                    }
                }
            }
        })

        observer.observe(container, { childList: true })

        const table = container.querySelector('table')
        if (table) {
            handler(file, table, false)
        }
    }
}

async function injectDiffusion(state: DiffusionState): Promise<void> {
    const file = document.getElementsByClassName('phui-main-column')[0] as HTMLElement
    const blob = tryGetBlobElement(file)
    if (!blob) {
        return
    }
    if (file.className.includes('sg-blob-annotated')) {
        // make this function idempotent
        return
    }
    file.className = `${file.className} sg-blob-annotated`

    const getTableElement = () => file.querySelector('table')!

    const getCodeCells = () => {
        const table = getTableElement()
        if (!table) {
            return []
        }
        return getCodeCellsForAnnotation(table)
    }

    const blobLines = await fetchBlobContentLines(state)
    if (blobLines.length === 0) {
        return
    }

    const mount = createBlobAnnotatorMount(file, '.phui-header-action-links', true)
    render(
        <BlobAnnotator
            getTableElement={getTableElement}
            getCodeCells={getCodeCells}
            getTargetLineAndOffset={getTargetLineAndOffset(blobLines)}
            findElementWithOffset={findElementWithOffset(blobLines)}
            findTokenCell={findTokenCell}
            filterTarget={noFilterFunction}
            getNodeToConvert={identityFunction}
            fileElement={file}
            repoPath={state.repoPath}
            commitID={state.commitID}
            filePath={state.filePath}
            isPullRequest={false}
            isSplitDiff={false}
            isCommit={false}
            isBase={false}
            buttonProps={diffusionButtonProps}
        />,
        mount
    )
}

async function injectChangeset(state: DifferentialState | RevisionState | ChangeState): Promise<void> {
    monitorFileContainers(
        'differential-changeset',
        'changeset-view-content',
        async (file: HTMLElement, table: HTMLTableElement, force: boolean) => {
            if (!force && file.classList.contains('sg-blob-annotated')) {
                // make this function idempotent
                return
            }

            file.classList.add('sg-blob-annotated')

            const mountBase = createBlobAnnotatorMount(file, '.differential-changeset-buttons', true)
            // TODO(isaac): Find a better way to patch the components.
            // MonitoredBlobAnnotator was not sufficient.
            unmountComponentAtNode(mountBase)
            if (!mountBase) {
                return
            }
            const mountHead = createBlobAnnotatorMount(file, '.differential-changeset-buttons', false)
            // TODO(isaac): Find a better way to patch the components.
            // MonitoredBlobAnnotator was not sufficient.
            unmountComponentAtNode(mountHead)
            if (!mountHead) {
                return
            }

            const { filePath, baseFilePath } = getFilepathFromFile(file)
            const isSplitDiff = table.classList.contains('diff-2up')

            const getTableElement = () => table

            const getCodeCells = (isBase: boolean) => () => {
                const table = getTableElement()
                if (!table) {
                    return []
                }

                return getCodeCellsForDifferentialAnnotations(table, isSplitDiff, isBase)
            }

            const filterTarget = (isBase: boolean) => (target: HTMLElement) => {
                const td = getTableDataCell(target)
                if (!td) {
                    return false
                }
                if (isSplitDiff) {
                    let curr = td as HTMLElement
                    while (curr.tagName !== 'TH') {
                        curr = curr.previousElementSibling as HTMLElement
                    }

                    // Base's line number cell will have no more siblings
                    // while the head's line number cell will.
                    if (isBase) {
                        return !curr.previousSibling
                    }

                    return !!curr.previousSibling
                }
                if (isBase) {
                    return td.classList.contains('left')
                }
                return !td.classList.contains('left')
            }

            switch (state.mode) {
                case PhabricatorMode.Differential: {
                    const {
                        baseRepoPath,
                        headRepoPath,
                        differentialID,
                        diffID,
                        leftDiffID,
                    } = state as DifferentialState
                    const resolveBaseRevOpt = {
                        repoPath: baseRepoPath,
                        differentialID,
                        diffID: (leftDiffID || diffID)!,
                        leftDiffID,
                        useDiffForBase: Boolean(leftDiffID), // if ?vs and base is not `on` i.e. the initial commit)
                        useBaseForDiff: false,
                        filePath: baseFilePath || filePath,
                        isBase: true,
                        isSplitDiff,
                        filterTarget: filterTarget(true),
                    }
                    const resolveHeadRevOpt = {
                        repoPath: headRepoPath,
                        differentialID,
                        diffID: diffID!,
                        leftDiffID,
                        useDiffForBase: false,
                        useBaseForDiff: false,
                        filePath,
                        isBase: false,
                        isSplitDiff,
                        filterTarget: filterTarget(false),
                    }
                    const [baseRev, headRev] = await Promise.all([
                        resolveDiff(resolveBaseRevOpt),
                        resolveDiff(resolveHeadRevOpt),
                    ])
                    const actualBaseRepoPath = baseRev.stagingRepoPath || baseRepoPath
                    const actualHeadRepoPath = headRev.stagingRepoPath || headRepoPath
                    const [baseFile, headFile] = await Promise.all([
                        fetchBlobContentLines({
                            repoPath: actualBaseRepoPath,
                            commitID: baseRev.commitID,
                            filePath: baseFilePath || filePath,
                        }),
                        fetchBlobContentLines({
                            repoPath: actualHeadRepoPath,
                            commitID: headRev.commitID,
                            filePath,
                        }),
                    ])

                    if (baseFile.length > 0) {
                        render(
                            <BlobAnnotator
                                {...resolveBaseRevOpt}
                                repoPath={actualBaseRepoPath}
                                commitID={baseRev.commitID}
                                getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                findElementWithOffset={findElementWithOffset(baseFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                isPullRequest={true}
                                isCommit={false}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(true)}
                            />,
                            mountBase
                        )
                    }

                    if (headFile.length > 0) {
                        render(
                            <BlobAnnotator
                                {...resolveHeadRevOpt}
                                repoPath={actualHeadRepoPath}
                                commitID={headRev.commitID}
                                getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                findElementWithOffset={findElementWithOffset(headFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                isPullRequest={true}
                                isCommit={false}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(false)}
                            />,
                            mountHead
                        )
                    }
                    break // end inner switch
                }

                case PhabricatorMode.Revision: {
                    const { repoPath, baseCommitID, headCommitID } = state as RevisionState
                    const [baseFile, headFile] = await Promise.all([
                        fetchBlobContentLines({ repoPath, commitID: baseCommitID, filePath }),
                        fetchBlobContentLines({ repoPath, commitID: headCommitID, filePath }),
                    ])
                    if (baseFile.length > 0) {
                        render(
                            <BlobAnnotator
                                getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                findElementWithOffset={findElementWithOffset(baseFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                repoPath={repoPath}
                                commitID={baseCommitID}
                                filePath={filePath}
                                isPullRequest={true}
                                isCommit={true}
                                isBase={true}
                                isSplitDiff={isSplitDiff}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(true)}
                                filterTarget={filterTarget(true)}
                            />,
                            mountBase
                        )
                    }
                    if (headFile.length > 0) {
                        render(
                            <BlobAnnotator
                                getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                findElementWithOffset={findElementWithOffset(headFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                repoPath={repoPath}
                                commitID={headCommitID}
                                filePath={filePath}
                                isPullRequest={false}
                                isCommit={true}
                                isBase={false}
                                isSplitDiff={isSplitDiff}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(false)}
                                filterTarget={filterTarget(false)}
                            />,
                            mountHead
                        )
                    }
                    break // end inner switch
                }

                case PhabricatorMode.Change: {
                    const { repoPath, commitID } = state as ChangeState
                    const baseRev = await resolveRev({ repoPath, rev: commitID + '~1' }).toPromise()
                    const [baseFile, headFile] = await Promise.all([
                        fetchBlobContentLines({ repoPath, commitID: baseRev, filePath }),
                        fetchBlobContentLines({ repoPath, commitID, filePath }),
                    ])
                    if (baseFile.length > 0) {
                        render(
                            <BlobAnnotator
                                getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                findElementWithOffset={findElementWithOffset(baseFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                repoPath={repoPath}
                                commitID={baseRev}
                                filePath={filePath}
                                isPullRequest={true}
                                isCommit={true}
                                isBase={true}
                                isSplitDiff={isSplitDiff}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(true)}
                                filterTarget={filterTarget(true)}
                            />,
                            mountBase
                        )
                    }
                    if (headFile.length > 0) {
                        render(
                            <BlobAnnotator
                                getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                findElementWithOffset={findElementWithOffset(headFile)}
                                findTokenCell={findTokenCell}
                                getNodeToConvert={identityFunction}
                                fileElement={file}
                                repoPath={repoPath}
                                commitID={commitID}
                                filePath={filePath}
                                isPullRequest={false}
                                isCommit={true}
                                isBase={false}
                                isSplitDiff={isSplitDiff}
                                buttonProps={differentialButtonProps}
                                getTableElement={getTableElement}
                                getCodeCells={getCodeCells(false)}
                                filterTarget={filterTarget(false)}
                            />,
                            mountHead
                        )
                    }
                    break // end inner switch
                }
            }
        }
    )
}

function hasThisFileChanged(filePath: string, changes: ConduitDiffChange[]): boolean {
    for (const change of changes) {
        if (change.currentPath === filePath) {
            return true
        }
    }
    return false
}

async function resolveDiff(props: ResolveDiffOpt): Promise<ResolvedDiff> {
    let propsWithInfo = await getDiffDetailsFromConduit(props.diffID, props.differentialID).then(info => ({
        ...props,
        info,
    }))
    if (propsWithInfo.isBase || !propsWithInfo.leftDiffID) {
        // no need to update propsWithInfo
    } else if (
        hasThisFileChanged(propsWithInfo.filePath, propsWithInfo.info.changes) ||
        propsWithInfo.isBase ||
        !propsWithInfo.leftDiffID
    ) {
        // no need to update propsWithInfo
    } else {
        propsWithInfo = await getDiffDetailsFromConduit(
            propsWithInfo.leftDiffID,
            propsWithInfo.differentialID
        ).then(info => ({ ...propsWithInfo, info, diffID: propsWithInfo.leftDiffID!, useBaseForDiff: true }))
    }

    if (!propsWithInfo.info.properties['arc.staging']) {
        // The last diff (final commit) is not found in the staging area, but rather on the description.
        if (propsWithInfo.isBase) {
            return { commitID: propsWithInfo.info.sourceControlBaseRevision }
        }
        return { commitID: propsWithInfo.info.description.substr(-40) }
    }
    let key: string
    if (propsWithInfo.isBase) {
        const type = propsWithInfo.useDiffForBase ? 'diff' : 'base'
        key = `refs/tags/phabricator/${type}/${propsWithInfo.diffID}`
    } else {
        const type = propsWithInfo.useBaseForDiff ? 'base' : 'diff'
        key = `refs/tags/phabricator/${type}/${propsWithInfo.diffID}`
    }
    for (const ref of propsWithInfo.info.properties['arc.staging'].refs) {
        if (ref.ref === key) {
            const remote = ref.remote.uri
            let stagingRepoPath: string | undefined
            if (remote) {
                stagingRepoPath = normalizeRepoPath(remote)
            }
            return { commitID: ref.commit, stagingRepoPath }
        }
    }

    if (!propsWithInfo.isBase) {
        for (const cmit of Object.keys(propsWithInfo.info.properties['local:commits'])) {
            return { commitID: cmit }
        }
    }

    // last ditch effort to search conduit API for commit ID
    try {
        const commitID = await searchForCommitID(propsWithInfo)
        return { commitID }
    } catch (e) {
        // ignore
    }

    throw new Error('did not find commitID')
}
