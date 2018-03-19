import browser from '../../extension/browser'
import storage from '../../extension/storage'
import { EventLogger } from '../tracking/EventLogger'

export let eventLogger: EventLogger

export function setEventLogger(logger: EventLogger): void {
    if (eventLogger) {
        console.error(`event logger is being set twice, currently is ${eventLogger} and being set to ${logger}`)
    }
    eventLogger = logger
}

export let sourcegraphUrl = window.localStorage.SOURCEGRAPH_URL || window.SOURCEGRAPH_URL || 'https://sourcegraph.com'

export let serverUrls = [sourcegraphUrl]

export let eventTrackingEnabled = false

export let sourcegraphRepoSearchToggled = false

export let repositorySearchEnabled = false

export let repositoryFileTreeEnabled = false

if (window.SG_ENV === 'EXTENSION') {
    storage.getSync(items => {
        serverUrls = items.serverUrls
        sourcegraphUrl = items.sourcegraphURL

        eventTrackingEnabled = items.eventTrackingEnabled

        sourcegraphRepoSearchToggled = items.sourcegraphRepoSearchToggled

        repositorySearchEnabled = items.repositorySearchEnabled

        repositoryFileTreeEnabled = items.repositoryFileTreeEnabled
    })
}

export function setSourcegraphUrl(url: string): void {
    sourcegraphUrl = url
}

export function setServerUrls(urls: string[]): void {
    serverUrls = urls
}

export function isBrowserExtension(): boolean {
    return window.SOURCEGRAPH_PHABRICATOR_EXTENSION || false
}

export function isOnlySourcegraphDotCom(urls: string[]): boolean {
    return !urls.some(url => url !== 'https://sourcegraph.com')
}

export function setSourcegraphRepoSearchToggled(enabled: boolean): void {
    sourcegraphRepoSearchToggled = enabled
}

export function setEventTrackingEnabled(enabled: boolean): void {
    eventTrackingEnabled = enabled
}

export function setRepositorySearchEnabled(enabled: boolean): void {
    repositorySearchEnabled = enabled
}

export function setRepositoryFileTreeEnabled(enabled: boolean): void {
    repositoryFileTreeEnabled = enabled
}

/**
 * supportedExtensions are the file extensions
 * the extension will apply annotations to
 */
export const supportedExtensions = new Set<string>([
    'go', // Golang
    'ts',
    'tsx', // TypeScript
    'js',
    'jsx', // JavaScript
    'java', // Java
    'py', // Python
    'php', // PHP
])

/**
 * getModeFromExtension returns the LSP mode for the
 * provided file extension (e.g. "jsx")
 */
export function getModeFromExtension(ext: string): string {
    switch (ext) {
        case 'go':
            return 'go'
        case 'ts':
        case 'tsx':
            return 'typescript'
        case 'js':
        case 'jsx':
            return 'javascript'
        case 'java':
            return 'java'
        case 'py':
        case 'pyc':
        case 'pyd':
        case 'pyo':
        case 'pyw':
        case 'pyz':
            return 'python'
        case 'php':
        case 'phtml':
        case 'php3':
        case 'php4':
        case 'php5':
        case 'php6':
        case 'php7':
        case 'phps':
            return 'php'
        default:
            return 'unknown'
    }
}

export function getPathExtension(path: string): string {
    const pathSplit = path.split('.')
    if (pathSplit.length === 1) {
        return ''
    }
    if (pathSplit.length === 2 && pathSplit[0] === '') {
        return '' // e.g. .gitignore
    }
    return pathSplit[pathSplit.length - 1].toLowerCase()
}

export function getPlatformName(): string {
    if (window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return 'phabricator-integration'
    }
    return isFirefoxExtension() ? 'firefox-extension' : 'chrome-extension'
}

export function getExtensionVersion(): string {
    const c = browser as any
    if (c && c.app && c.app.getDetails) {
        const details = c.app.getDetails()
        if (details && details.version) {
            return details.version
        }
    }
    if (c && c.runtime && c.runtime.getManifest) {
        const manifest = c.runtime.getManifest()
        if (manifest && manifest.version) {
            return manifest.version
        }
    }
    return 'NO_VERSION'
}

export function isFirefoxExtension(): boolean {
    return window.navigator.userAgent.indexOf('Firefox') !== -1
}

export function isE2ETest(): boolean {
    return process.env.NODE_ENV === 'test'
}

/**
 * This method created a unique username based on the platform and domain the user is visiting.
 * Examples: sg_dev_phabricator:matt
 */
export function getDomainUsername(domain: string, username: string): string {
    return `${domain}:${username}`
}
