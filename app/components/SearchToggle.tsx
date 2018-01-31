import * as github from '../github/util'
import { listAllSearchResults, resolveRev } from '../repo/backend'
import { eventLogger, getPlatformName, repositorySearchEnabled, sourcegraphUrl } from '../util/context'
import { insertAfter } from '../util/dom'

const SOURCEGRAPH_SEARCH_TOGGLE_ID = 'sourcegraph-search-toggle'
const SCOPED_REPO_SEARCH_CLASS = '.header-search.scoped-search'

const ENABLED_HOVER_TEXT = 'Disable search on Sourcegraph'
const DISABLED_HOVER_TEXT = 'Enable search on Sourcegraph'

/**
 * Converts a relative path within an extension install directory to a fully-qualified URL.
 * TODO(john): we don't need this, we should use react icons
 * @param img Image name
 */
function getAssetURL(img: string): string {
    return chrome.extension.getURL(`img/${img}`)
}

export function injectRepositorySearchToggle(): void {
    if (canRenderRepositorySearch()) {
        chrome.storage.sync.get(items => {
            sourcegraphSearchToggle(items.sourcegraphRepoSearchToggled)
        })
    }

    if (canRenderSourcegraphSearchResults()) {
        renderSourcegraphSearchResultCountItem()
    }
}

function sourcegraphSearchToggle(toggled: boolean): void {
    if (document.getElementById(SOURCEGRAPH_SEARCH_TOGGLE_ID)) {
        return
    }

    const formContainer = scopedRepoSearchFormContainer()
    if (!formContainer) {
        return
    }

    const labelInput = document.querySelector('.form-control.header-search-input') as HTMLInputElement
    const wrapper = document.querySelector('.form-control.header-search-wrapper') as HTMLElement

    if (labelInput) {
        formContainer.style.minWidth = '340px !important'
        labelInput.style.minWidth = '340px !important'
        labelInput.onfocus = () => {
            if (wrapper) {
                wrapper.classList.remove('focus')
            }
        }

        const icon = document.createElement('img')
        icon.src = getAssetURL('sourcegraph-mark.svg')
        icon.style.display = 'block'
        icon.style.margin = 'auto'
        icon.style.width = '22px'
        icon.style.height = '22px'
        icon.style.opacity = toggled ? '1.0' : '0.5'

        const a = document.createElement('a')
        a.id = 'hover-tooltip'
        a.className = 'tooltipped'
        a.setAttribute('aria-label', toggled ? ENABLED_HOVER_TEXT : DISABLED_HOVER_TEXT)
        a.appendChild(icon)

        const container = document.createElement('div')
        container.style.cursor = 'pointer'
        container.onclick = () => {
            toggled = !toggled
            eventLogger.logSourcegraphRepoSearchToggled({ toggled })
            chrome.storage.sync.set({ sourcegraphRepoSearchToggled: toggled })
            a.setAttribute('aria-label', toggled ? ENABLED_HOVER_TEXT : DISABLED_HOVER_TEXT)
            icon.style.opacity = toggled ? '1.0' : '0.5'
        }
        container.id = SOURCEGRAPH_SEARCH_TOGGLE_ID
        container.style.minWidth = '30px'
        container.style.width = '30px'
        container.style.height = '30px'
        container.style.display = 'inline-block'
        container.className = 'header-search scoped-search site-scoped-search js-site-search'
        container.style.backgroundColor = 'rgba(66, 70, 74, 0.9)'
        container.style.paddingTop = '4px'
        container.style.marginLeft = '-8px'
        container.style.borderTopRightRadius = '3px'
        container.style.borderBottomRightRadius = '3px'
        container.appendChild(a)
        insertAfter(container, formContainer.parentNode!)
        if (formContainer.parentElement) {
            if (
                formContainer.parentElement.classList.contains('flex-items-center') ||
                formContainer.parentElement.className === 'd-lg-flex flex-items-center mr-3'
            ) {
                // No user
                insertAfter(container, formContainer)
            } else {
                // User logged in
                insertAfter(container, formContainer.parentNode!)
            }
        }
        const form = document.querySelector('.js-site-search-form') as HTMLFormElement
        if (form) {
            wrapper.style.borderTopRightRadius = '0px'
            wrapper.style.borderBottomRightRadius = '0px'
            form.style.minWidth = '340px !important'
            form.onsubmit = () => {
                if (toggled && scopedRepoSearchFormContainer()) {
                    const searchQuery = labelInput.value
                    const linkProps = getSourcegraphURLProps(searchQuery)
                    if (linkProps) {
                        eventLogger.logSourcegraphRepoSearchSubmitted({ ...linkProps, query: searchQuery })
                        window.open(linkProps.url, '_blank')
                    }
                }
            }
        }
    }
}

function canRenderSourcegraphSearchResults(): boolean {
    return Boolean(document.querySelector('.codesearch-results'))
}

function renderSourcegraphSearchResultCountItem(): void {
    const menuContainer = document.querySelector('.menu.border') as HTMLElement
    if (!menuContainer) {
        return
    }
    const labelInput = document.querySelector('.form-control.header-search-input') as HTMLInputElement
    if (!labelInput) {
        return
    }

    const searchQuery = labelInput.value
    const linkProps = getSourcegraphURLProps(searchQuery)
    if (linkProps) {
        eventLogger.logSourcegraphRepoSearchSubmitted({ ...linkProps, query: searchQuery })
        resolveRev({ repoPath: linkProps.repo, rev: linkProps.rev || '' })
            .toPromise()
            .then(resolvedRev => {
                let resultListItem = document.getElementById('sourcegraph-search-result-count') as HTMLAnchorElement
                const resultCount = document.createElement('span') as HTMLSpanElement
                if (!resultListItem) {
                    resultListItem = document.createElement('a') as HTMLAnchorElement
                    resultListItem.className = 'menu-item'
                    resultListItem.id = 'sourcegraph-search-result-count'
                    resultListItem.textContent = 'Code (Sourcegraph)'
                    resultListItem.appendChild(resultCount)
                    insertAfter(resultListItem, menuContainer.firstElementChild!)
                }
                resultListItem.href = linkProps.url
                listAllSearchResults({ query: linkProps.query })
                    .then(count => {
                        resultCount.innerText = count.toString()
                        resultCount.className = 'Counter ml-1 mt-1'
                    })
                    .catch(() => {
                        resultListItem.style.display = 'none'
                    })
            })
            .catch(() => {
                /** noop */
            })
    }
}

function scopedRepoSearchFormContainer(): HTMLElement | null {
    return document.querySelector(SCOPED_REPO_SEARCH_CLASS) as HTMLElement
}

function canRenderRepositorySearch(): boolean {
    return Boolean(document.querySelector('.header-search-scope')) && repositorySearchEnabled
}

function getSourcegraphURLProps(
    query: string
): { url: string; repo: string; rev: string | undefined; query: string } | undefined {
    const { repoPath, rev } = github.parseURL()
    if (repoPath) {
        const url = `${sourcegraphUrl}/search`
        if (rev) {
            return {
                url: `${url}?q=${encodeURIComponent(query)}&sq=repo:%5E${encodeURIComponent(
                    repoPath.replace(/\./g, '\\.')
                )}%24@${encodeURIComponent(rev)}&utm_source=${getPlatformName()}`,
                repo: repoPath,
                rev,
                query: `${encodeURIComponent(query)} ${encodeURIComponent(
                    repoPath.replace(/\./g, '\\.')
                )}%24@${encodeURIComponent(rev)}`,
            }
        }
        return {
            url: `${url}?q=${encodeURIComponent(query)}&sq=repo:%5E${encodeURIComponent(
                repoPath.replace(/\./g, '\\.')
            )}%24&utm_source=${getPlatformName()}`,
            repo: repoPath,
            rev,
            query: `repo:^${repoPath.replace(/\./g, '\\.')}$ ${query}`,
        }
    }
}
