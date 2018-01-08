import * as React from 'react'
import { render } from 'react-dom'
import 'rxjs/add/operator/toPromise'
import { BlobAnnotator } from '../components/BlobAnnotator'
import { fetchBlobContentLines, resolveRev } from '../repo/backend'
import { getTableDataCell } from '../repo/tooltips'
import { ConduitDiffChange, getDiffDetailsFromConduit } from './backend'
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
    expanderListen,
    getCodeCellsForAnnotation,
    getCodeCellsForDifferentialAnnotations,
    getFilepathFromFile,
    getPhabricatorState,
    javelinPierce,
    metaClickOverride,
    normalizeRepoPath,
    PHAB_PAGE_LOAD_EVENT_NAME,
    setupPageLoadListener,
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
            const files = document.getElementsByClassName('differential-changeset') as HTMLCollectionOf<HTMLElement>
            for (const file of Array.from(files)) {
                if (file.className.includes('sg-blob-annotated')) {
                    // make this function idempotent
                    return
                }

                const getTableElement = () => file.querySelector('table')!
                if (!getTableElement()) {
                    // TODO(john): figure out something better to do
                    continue
                }
                file.className = `${file.className} sg-blob-annotated`
                const isSplitDiff = getTableElement()!.classList.contains('diff-2up')

                const getCodeCellsBase = () => {
                    const table = getTableElement()
                    if (!table) {
                        return []
                    }
                    return getCodeCellsForDifferentialAnnotations(table, isSplitDiff, true)
                }

                const getCodeCellsHead = () => {
                    const table = getTableElement()
                    if (!table) {
                        return []
                    }
                    return getCodeCellsForDifferentialAnnotations(table, isSplitDiff, false)
                }

                const filterTarget = (isBase: boolean) => (target: HTMLElement) => {
                    const td = getTableDataCell(target)
                    if (!td) {
                        return false
                    }
                    if (isSplitDiff) {
                        if (isBase) {
                            return td.colSpan === 1
                        } else {
                            return td.colSpan === 2
                        }
                    }
                    if (isBase) {
                        return td.classList.contains('left')
                    } else {
                        return !td.classList.contains('left')
                    }
                }

                const mountBase = createBlobAnnotatorMount(file, '.differential-changeset-buttons', true)
                if (!mountBase) {
                    continue
                }
                const mountHead = createBlobAnnotatorMount(file, '.differential-changeset-buttons', false)
                if (!mountHead) {
                    continue
                }

                const { filePath, baseFilePath } = getFilepathFromFile(file)

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
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsBase}
                                    getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                    findElementWithOffset={findElementWithOffset(baseFile)}
                                    filterTarget={filterTarget(true)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    isPullRequest={true}
                                    isSplitDiff={isSplitDiff}
                                    isCommit={false}
                                    buttonProps={differentialButtonProps}
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
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsHead}
                                    getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                    findElementWithOffset={findElementWithOffset(headFile)}
                                    filterTarget={filterTarget(false)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    isPullRequest={true}
                                    isSplitDiff={isSplitDiff}
                                    isCommit={false}
                                    buttonProps={differentialButtonProps}
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
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsBase}
                                    getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                    findElementWithOffset={findElementWithOffset(baseFile)}
                                    filterTarget={filterTarget(true)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    repoPath={repoPath}
                                    commitID={baseCommitID}
                                    filePath={filePath}
                                    isPullRequest={true}
                                    isCommit={true}
                                    isSplitDiff={isSplitDiff}
                                    isBase={true}
                                    buttonProps={differentialButtonProps}
                                />,
                                mountBase
                            )
                        }
                        if (headFile.length > 0) {
                            render(
                                <BlobAnnotator
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsHead}
                                    getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                    findElementWithOffset={findElementWithOffset(headFile)}
                                    filterTarget={filterTarget(false)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    repoPath={repoPath}
                                    commitID={headCommitID}
                                    filePath={filePath}
                                    isPullRequest={false}
                                    isCommit={true}
                                    isSplitDiff={isSplitDiff}
                                    isBase={false}
                                    buttonProps={differentialButtonProps}
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
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsBase}
                                    getTargetLineAndOffset={getTargetLineAndOffset(baseFile)}
                                    findElementWithOffset={findElementWithOffset(baseFile)}
                                    filterTarget={filterTarget(true)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    repoPath={repoPath}
                                    commitID={baseRev}
                                    filePath={filePath}
                                    isPullRequest={true}
                                    isCommit={true}
                                    isSplitDiff={isSplitDiff}
                                    isBase={true}
                                    buttonProps={differentialButtonProps}
                                />,
                                mountBase
                            )
                        }
                        if (headFile.length > 0) {
                            render(
                                <BlobAnnotator
                                    getTableElement={getTableElement}
                                    getCodeCells={getCodeCellsHead}
                                    getTargetLineAndOffset={getTargetLineAndOffset(headFile)}
                                    findElementWithOffset={findElementWithOffset(headFile)}
                                    filterTarget={filterTarget(false)}
                                    getNodeToConvert={identityFunction}
                                    fileElement={file}
                                    repoPath={repoPath}
                                    commitID={commitID}
                                    filePath={filePath}
                                    isPullRequest={false}
                                    isCommit={true}
                                    isSplitDiff={isSplitDiff}
                                    isBase={false}
                                    buttonProps={differentialButtonProps}
                                />,
                                mountHead
                            )
                        }
                        break // end inner switch
                    }
                }
            }
            break // end switch
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

// This is injection for the chrome extension.
export function injectPhabricatorApplication(): void {
    // make sure this is called before javelinPierce
    document.addEventListener(PHAB_PAGE_LOAD_EVENT_NAME, () => {
        injectModules()
        // setTimeout(injectModules, 5000) // extra data may be loaded asynchronously; reapply after timeout
    })
    javelinPierce(setupPageLoadListener, 'body')
    javelinPierce(expanderListen, 'body')
    javelinPierce(metaClickOverride, 'body')
}

function injectModules(): void {
    injectPhabricatorBlobAnnotators().catch(e => console.error(e))
    setTimeout(() => {
        injectPhabricatorBlobAnnotators().catch(e => console.error(e))
    }, 1000)
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
            console.log(propsWithInfo, ref.commit, stagingRepoPath)
            return { commitID: ref.commit, stagingRepoPath }
        }
    }

    throw new Error('did not find commitID')
}
