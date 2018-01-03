import { CodeCell } from '../repo/index'
import { getRepoDetailsFromCallsign, getRepoDetailsFromDifferentialID } from './backend'
import { ChangeState, DifferentialState, DiffusionState, PhabricatorMode, RevisionState } from './index'

const TAG_PATTERN = /r([0-9A-z]+)([0-9a-f]{40})/
function matchPageTag(): RegExpExecArray | null {
    const el = document.getElementsByClassName('phui-tag-core').item(0)
    if (!el) {
        return null
    }
    return TAG_PATTERN.exec(el.children[0].getAttribute('href') as string)
}

function getCallsignFromPageTag(): string | null {
    const match = matchPageTag()
    if (!match) {
        return null
    }
    return match[1]
}

function getCommitIDFromPageTag(): string | null {
    const match = matchPageTag()
    if (!match) {
        return null
    }
    return match[2]
}

function isDifferentialLanded(): boolean {
    const closedElement = document.getElementsByClassName('visual-only phui-icon-view phui-font-fa fa-check-square-o')
    if (closedElement.length === 0) {
        return false
    }
    return true
}

const DIFF_LINK = /D[0-9]+\?id=([0-9]+)/i
function getMaxDiffFromTabView(): { diffID: number; revDescription: string } | null {
    // first, find Revision contents table box
    const headerShells = document.getElementsByClassName('phui-header-header')
    let revisionContents: Element | null = null
    for (const headerShell of Array.from(headerShells)) {
        if (headerShell.textContent === 'Revision Contents') {
            revisionContents = headerShell
        }
    }
    if (!revisionContents) {
        return null
    }
    const parentContainer = revisionContents.parentElement!.parentElement!.parentElement!.parentElement!.parentElement!
    const tables = parentContainer.getElementsByClassName('aphront-table-view')
    for (const table of Array.from(tables)) {
        const tableRows = (table as HTMLTableElement).rows
        const row = tableRows[0]
        // looking for the history tab of the revision contents table
        if (row.children[0].textContent !== 'Diff') {
            continue
        }
        const links = table.getElementsByTagName('a')
        let max: { diffID: number; revDescription: string } | null = null
        for (const link of Array.from(links)) {
            const linkHref = link.getAttribute('href')
            if (!linkHref) {
                continue
            }
            const matches = DIFF_LINK.exec(linkHref)
            if (!matches) {
                continue
            }
            const revDescription = (link.parentNode!.parentNode!.childNodes[2].childNodes[0] as any).href
            const shaMatch = TAG_PATTERN.exec(revDescription!)
            if (!shaMatch) {
                continue
            }
            max =
                max && max.diffID > parseInt(matches[1], 10)
                    ? max
                    : { diffID: parseInt(matches[1], 10), revDescription: shaMatch[2] }
        }
        return max
    }
    return null
}

// function getCallsignDifferentialPage(): string | null {
//     const mainColumn = document.getElementsByClassName('phui-main-column').item(0)
//     if (!mainColumn) {
//         console.warn('no \'phui-main-column\'[0] class found')
//         return null
//     }
//     const diffDetailBox = mainColumn.children[1]
//     const repositoryTag = diffDetailBox.getElementsByClassName('phui-property-list-value').item(0)
//     if (!repositoryTag) {
//         console.warn('no \'phui-property-list-value\'[0] class found')
//         return null
//     }
//     let diffusionPath = repositoryTag.children[0].getAttribute('href') // e.g. /source/CALLSIGN/ or /diffusion/CALLSIGN/
//     if (!diffusionPath) {
//         console.warn('no diffusion path found')
//         return null
//     }
//     if (diffusionPath.startsWith('/source/')) {
//         diffusionPath = diffusionPath.substr('/source/'.length)
//     } else if (diffusionPath.startsWith('/diffusion/')) {
//         diffusionPath = diffusionPath.substr('/diffusion/'.length)
//     } else {
//         console.error(`unexpected prefix on diffusion path ${diffusionPath}`)
//         return null
//     }
//     return diffusionPath.substr(0, diffusionPath.length - 1)
// }

const DIFF_PATTERN = /Diff ([0-9]+)/
function getDiffIdFromDifferentialPage(): string | null {
    const diffsContainer = document.getElementById('differential-review-stage')
    if (!diffsContainer) {
        console.error(`no element with id differential-review-stage found on page.`)
        return null
    }
    const wrappingDiffBox = diffsContainer.parentElement
    if (!wrappingDiffBox) {
        console.error(`parent container of diff container not found.`)
        return null
    }
    const diffTitle = wrappingDiffBox.children[0].getElementsByClassName('phui-header-header').item(0)
    if (!diffTitle || !diffTitle.textContent) {
        return null
    }
    const matches = DIFF_PATTERN.exec(diffTitle.textContent)
    if (!matches) {
        return null
    }
    return matches[1]
}

const PHAB_DIFFUSION_REGEX = /^(https?):\/\/([A-Z\d\.-]{2,})\.([A-Z]{2,})(:\d{2,4})?\/(source|diffusion)\/([A-Za-z0-9]+)\/browse\/([\w-]+\/)?([^;$]+)(;[0-9a-f]{40})?(?:\$[0-9]+)?/i
const PHAB_DIFFERENTIAL_REGEX = /^(https?):\/\/([A-Z\d\.-]{2,})\.([A-Z]{2,})(:\d{2,4})?\/(D[0-9]+)(?:\?(?:(?:id=([0-9]+))|(vs=(?:[0-9]+|on)&id=[0-9]+)))?/i
const PHAB_REVISION_REGEX = /^(https?):\/\/([A-Z\d\.-]{2,})\.([A-Z]{2,})(:\d{2,4})?\/r([0-9A-z]+)([0-9a-f]{40})/i
// http://phabricator.aws.sgdev.org/source/nmux/change/master/mux.go
const PHAB_CHANGE_REGEX = /^(https?):\/\/([A-Z\d\.-]{2,})\.([A-Z]{2,})(:\d{2,4})?\/(source|diffusion)\/([A-Za-z0-9]+)\/change\/([\w-]+)\/([^;]+)(;[0-9a-f]{40})?/i
const PHAB_CHANGESET_REGEX = /^(https?):\/\/([A-Z\d\.-]{2,})\.([A-Z]{2,})(:\d{2,4})?\/differential\/changeset.*/i
const COMPARISON_REGEX = /^vs=((?:[0-9]+|on))&id=([0-9]+)/i

function getBaseCommitIDFromRevisionPage(): string | null {
    const keyElements = document.getElementsByClassName('phui-property-list-key')
    for (const keyElement of Array.from(keyElements)) {
        if (keyElement.textContent === 'Parents ') {
            const parentUrl = ((keyElement.nextSibling as HTMLElement).children[0].children[0] as HTMLLinkElement).href
            const revisionMatch = PHAB_REVISION_REGEX.exec(parentUrl)
            if (revisionMatch) {
                return revisionMatch[6]
            }
        }
    }
    return null
}

export async function getPhabricatorState(
    loc: Location
): Promise<DiffusionState | DifferentialState | RevisionState | ChangeState | null> {
    const diffusionMatch = PHAB_DIFFUSION_REGEX.exec(loc.href)
    if (diffusionMatch) {
        const match = {
            protocol: diffusionMatch[1],
            hostname: diffusionMatch[2],
            tld: diffusionMatch[3],
            port: diffusionMatch[4],
            viewType: diffusionMatch[5],
            callsign: diffusionMatch[6],
            branch: diffusionMatch[7],
            filePath: diffusionMatch[8],
            revInUrl: diffusionMatch[9], // only on previous versions
        }
        if (match.branch && match.branch.endsWith('/')) {
            // Remove trailing slash (included b/c branch group is optional)
            match.branch = match.branch.substr(match.branch.length - 1)
        }

        const callsign = getCallsignFromPageTag()
        if (!callsign) {
            console.error('could not locate callsign for differential page')
            return null
        }
        match.callsign = callsign
        const repoPath = (await getRepoDetailsFromCallsign(callsign)).repoPath
        const commitID = getCommitIDFromPageTag()
        if (!commitID) {
            console.error('cannot determine commitIDision from page')
            return null
        }
        return {
            repoPath,
            rev: match.branch,
            filePath: match.filePath,
            mode: PhabricatorMode.Diffusion,
            commitID,
        }
    }

    const differentialMatch = PHAB_DIFFERENTIAL_REGEX.exec(loc.href)
    if (differentialMatch) {
        const match = {
            protocol: differentialMatch[1],
            hostname: differentialMatch[2],
            tld: differentialMatch[3],
            port: differentialMatch[4],
            differentialID: differentialMatch[5],
            diffID: differentialMatch[6],
            comparison: differentialMatch[7],
        }
        const differentialID = parseInt(match.differentialID.split('D')[1], 10)
        let diffID = match.diffID ? parseInt(match.diffID, 10) : undefined
        const { callsign } = await getRepoDetailsFromDifferentialID(differentialID)
        if (!callsign) {
            console.error(`callsign not found`)
            return null
        }
        if (!diffID) {
            const fromPage = getDiffIdFromDifferentialPage()
            if (fromPage) {
                diffID = parseInt(fromPage, 10)
            }
        }
        if (!diffID) {
            console.error(`differential id not found on page.`)
            return null
        }
        const repoPath = (await getRepoDetailsFromCallsign(callsign)).repoPath
        let baseRev = `phabricator/base/${diffID}`
        let headRev = `phabricator/diff/${diffID}`

        let leftDiffID: number | undefined

        const maxDiff = getMaxDiffFromTabView()
        const diffLanded = isDifferentialLanded()
        if (diffLanded && !maxDiff) {
            console.error(
                'looking for the final diff id in the revision contents table failed. expected final row to have the commit in the description field.'
            )
            return null
        }
        if (match.comparison) {
            // urls that looks like this: http://phabricator.aws.sgdev.org/D3?vs=on&id=8&whitespace=ignore-most#toc
            // if the first parameter (vs=) is not 'on', not sure how to handle
            const comparisonMatch = COMPARISON_REGEX.exec(match.comparison)!
            const leftID = comparisonMatch[1]
            if (leftID !== 'on') {
                leftDiffID = parseInt(leftID, 10)
                baseRev = `phabricator/diff/${leftDiffID}`
            } else {
                baseRev = `phabricator/base/${comparisonMatch[2]}`
            }
            headRev = `phabricator/diff/${comparisonMatch[2]}`
            if (diffLanded && maxDiff && comparisonMatch[2] === `${maxDiff.diffID}`) {
                headRev = maxDiff.revDescription
                baseRev = headRev.concat('~1')
            }
        } else {
            // check if the diff we are viewing is the max diff. if so,
            // right is the merged rev into master, and left is master~1
            if (diffLanded && maxDiff && diffID === maxDiff.diffID) {
                headRev = maxDiff.revDescription
                baseRev = maxDiff.revDescription.concat('~1')
            }
        }
        return {
            baseRepoPath: repoPath,
            baseRev,
            headRepoPath: repoPath,
            headRev, // This will be blank on GitHub, but on a manually staged instance should exist
            differentialID,
            diffID,
            leftDiffID,
            mode: PhabricatorMode.Differential,
        }
    }

    const revisionMatch = PHAB_REVISION_REGEX.exec(loc.href)
    if (revisionMatch) {
        const match = {
            protocol: revisionMatch[1],
            hostname: revisionMatch[2],
            tld: revisionMatch[3],
            port: revisionMatch[4],
            callsign: revisionMatch[5],
            rev: revisionMatch[6],
        }

        const repoPath = (await getRepoDetailsFromCallsign(match.callsign)).repoPath

        const headCommitID = match.rev
        const baseCommitID = getBaseCommitIDFromRevisionPage()
        if (!baseCommitID) {
            console.error(`did not successfully determine parent revision.`)
            return null
        }
        return {
            repoPath,
            baseCommitID,
            headCommitID,
            mode: PhabricatorMode.Revision,
        }
    }

    const changeMatch = PHAB_CHANGE_REGEX.exec(loc.href)
    if (changeMatch) {
        const match = {
            protocol: changeMatch[1],
            hostname: changeMatch[2],
            tld: changeMatch[3],
            port: changeMatch[4],
            viewType: changeMatch[5],
            callsign: changeMatch[6],
            branch: changeMatch[7],
            filePath: changeMatch[8],
            revInUrl: changeMatch[9], // only on previous versions
        }

        const callsign = getCallsignFromPageTag()
        if (!callsign) {
            console.error('could not locate callsign for differential page')
            return null
        }
        match.callsign = callsign
        const repoPath = (await getRepoDetailsFromCallsign(callsign)).repoPath

        const commitID = getCommitIDFromPageTag()
        if (!commitID) {
            console.error('cannot determine revision from page.')
            return null
        }
        return {
            repoPath,
            filePath: match.filePath,
            mode: PhabricatorMode.Change,
            commitID,
        }
    }

    const changesetMatch = PHAB_CHANGESET_REGEX.exec(loc.href)
    if (changesetMatch) {
        // TODO(john): implement...I'm not sure how
    }

    return null
}

export function getFilepathFromFile(fileContainer: HTMLElement): { filePath: string; baseFilePath?: string } {
    const filePath = fileContainer.children[3].textContent as string
    const metas = fileContainer.querySelectorAll('.differential-meta-notice')
    let baseFilePath: string | undefined
    const movedFilePrefix = 'This file was moved from '
    for (const meta of metas) {
        let metaText = meta.textContent!
        if (metaText.startsWith(movedFilePrefix)) {
            metaText = metaText.substr(0, metaText.length - 1) // remove trailing '.'
            baseFilePath = metaText.split(movedFilePrefix)[1]
            break
        }
    }
    return { filePath, baseFilePath }
}

export function tryGetBlobElement(file: HTMLElement): HTMLElement | null {
    // TODO(@uforic): https://secure.phabricator.com/diffusion/ARC/browse/master/NOTICE , repository-crossreference doesn't work.
    return file.querySelector('.repository-crossreference') as HTMLElement | null
}

/**
 * getCodeCellsForAnnotation code cells which should be annotated
 */
export function getCodeCellsForAnnotation(table: HTMLTableElement): CodeCell[] {
    const cells: CodeCell[] = []
    // tslint:disable-next-line:prefer-for-of
    for (const row of Array.from(table.rows)) {
        let line: number // line number of the current line
        let codeCell: HTMLTableDataCellElement // the actual cell that has code inside; each row contains multiple columns
        let isBlameEnabled = false
        if (row.cells[0].classList.contains('diffusion-blame-link')) {
            isBlameEnabled = true
        }
        line = parseInt(row.cells[isBlameEnabled ? 2 : 0].children[0].textContent as string, 10)
        codeCell = row.cells[isBlameEnabled ? 3 : 1]
        if (!codeCell) {
            continue
        }

        const innerCode = codeCell.querySelector('.blob-code-inner') // ignore extraneous inner elements, like "comment" button on diff views
        cells.push({
            eventHandler: codeCell, // TODO(john): fix
            cell: (innerCode || codeCell) as HTMLElement,
            line,
        })
    }
    return cells
}

/**
 * getCodeCellsForAnnotation code cells which should be annotated
 */
export function getCodeCellsForDifferentialAnnotations(
    table: HTMLTableElement,
    isSplitView: boolean,
    isBase: boolean
): CodeCell[] {
    const cells: CodeCell[] = []
    // tslint:disable-next-line:prefer-for-of
    for (const row of Array.from(table.rows)) {
        if (row.getAttribute('data-sigil')) {
            // skip rows that have expander links
            continue
        }
        if (isSplitView) {
            const baseLine = parseInt(row.cells[0].textContent as string, 10)
            const headLine = parseInt(row.cells[2].textContent as string, 10)
            const baseCodeCell = row.cells[1]
            const headCodeCell = row.cells[4]
            if (isBase && baseLine && baseCodeCell) {
                cells.push({
                    cell: baseCodeCell,
                    eventHandler: baseCodeCell, // TODO(john): fix
                    line: baseLine,
                    isAddition: false,
                    isDeletion: false,
                })
            }
            if (!isBase && headLine && headCodeCell) {
                cells.push({
                    cell: headCodeCell,
                    eventHandler: headCodeCell, // TODO(john): fix
                    line: headLine,
                    isAddition: false,
                    isDeletion: false,
                })
            }
        } else {
            const baseLine = parseInt(row.cells[0].textContent as string, 10)
            const headLine = parseInt(row.cells[1].textContent as string, 10)
            const codeCell = row.cells[3]
            if (isBase && baseLine && codeCell) {
                cells.push({
                    cell: codeCell,
                    eventHandler: codeCell, // TODO(john): fix
                    line: baseLine,
                    isAddition: false,
                    isDeletion: false,
                })
            } else if (!isBase && headLine && codeCell) {
                if (!codeCell.classList.contains('old') && !codeCell.classList.contains('new')) {
                    // We don't want to add the white lines (unchanged) for head and base both times, so opt for base.
                    continue
                }
                cells.push({
                    cell: codeCell,
                    eventHandler: codeCell, // TODO(john): fix
                    line: headLine,
                    isAddition: false,
                    isDeletion: false,
                })
            }
        }
    }
    return cells
}

/**
 * This injects code as a script tag into a web page body.
 * Needed to defeat the Phabricator Javelin library.
 */
export function javelinPierce(code: () => void, node: string): void {
    const th = document.getElementsByTagName(node)[0]
    const s = document.createElement('script')
    s.setAttribute('type', 'text/javascript')
    s.textContent = code.toString() + ';' + code.name + '();'
    th.appendChild(s)
}

export const PHAB_PAGE_LOAD_EVENT_NAME = 'phabPageLoaded'

/**
 * This hooks into the Javelin event queue by adding an additional onload function.
 * Needed to successfully detect when a Phabricator page has loaded.
 * Fires a new event type not caught by Javelin that we can listen to, phabPageLoaded.
 */
export function setupPageLoadListener(): void {
    const JX = (window as any).JX
    JX.onload(() => document.dispatchEvent(new Event('phabPageLoaded', {})))
}

/**
 * This hacks javelin Stratcom to allow for the detection of blob expansion. Normally,
 * javelin Stratcom kills the mouse click event before it can propogate to detection code.
 * Instead, we check every event that passes by Stratcom and if we see a show-more event,
 * propogate it onwards.
 */
export function expanderListen(): void {
    const JX = (window as any).JX
    if (JX.Stratcom._dispatchProxyPreExpander) {
        return
    }
    JX.Stratcom._dispatchProxyPreExpander = JX.Stratcom._dispatchProxy
    JX.Stratcom._dispatchProxy = proxyEvent => {
        if (proxyEvent.isNormalClick() && proxyEvent.getNodes()['show-more']) {
            proxyEvent.__auto__target.parentElement.parentElement.parentElement.parentElement.dispatchEvent(
                new Event('expandClicked', {})
            )
        }
        return JX.Stratcom._dispatchProxyPreExpander(proxyEvent)
    }
}

/**
 * This hacks javelin Stratcom to ignore command + click actions on sg-clickable tokens.
 * Without this, two windows open when a user command + clicks on a token.
 */
export function metaClickOverride(): void {
    const JX = (window as any).JX
    if (JX.Stratcom._dispatchProxyPreMeta) {
        return
    }
    JX.Stratcom._dispatchProxyPreMeta = JX.Stratcom._dispatchProxy
    JX.Stratcom._dispatchProxy = proxyEvent => {
        if (
            proxyEvent.__auto__type === 'click' &&
            proxyEvent.__auto__rawEvent.metaKey &&
            proxyEvent.__auto__target.classList.contains('sg-clickable')
        ) {
            return
        }
        return JX.Stratcom._dispatchProxyPreMeta(proxyEvent)
    }
}

const USERNAME_URL_PATTERN = /\/p\/([A-Z0-9-]+)/i
export function getPhabricatorUsername(): string | null {
    const coreMenuItems = document.getElementsByClassName('phabricator-core-user-menu')
    for (const coreMenuItem of Array.from(coreMenuItems)) {
        const possiblePersonUrl = coreMenuItem.getAttribute('href')
        if (!possiblePersonUrl) {
            continue
        }
        const match = USERNAME_URL_PATTERN.exec(possiblePersonUrl)
        if (!match) {
            continue
        }
        return match[1]
    }
    return null
}

export function normalizeRepoPath(origin: string): string {
    let repoPath = origin
    repoPath = repoPath.replace('\\', '')
    if (origin.startsWith('git@')) {
        repoPath = origin.substr('git@'.length)
        repoPath = repoPath.replace(':', '/')
    } else if (origin.startsWith('git://')) {
        repoPath = origin.substr('git://'.length)
        if (!repoPath.endsWith('.git')) {
            repoPath += '.git'
        }
    } else if (origin.startsWith('https://')) {
        repoPath = origin.substr('https://'.length)
    } else if (origin.includes('@')) {
        // Assume the origin looks like `username@host:repo/path`
        const split = origin.split('@')
        repoPath = split[1]
        repoPath = repoPath.replace(':', '/')
    }

    return repoPath
}
