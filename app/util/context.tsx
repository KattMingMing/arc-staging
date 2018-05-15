import * as runtime from '../../extension/runtime'
import storage from '../../extension/storage'
import { EventLogger } from '../tracking/EventLogger'

export let eventLogger = new EventLogger()

export let sourcegraphUrl = window.localStorage.SOURCEGRAPH_URL || window.SOURCEGRAPH_URL || 'https://sourcegraph.com'

export let serverUrls = [sourcegraphUrl]

export let eventTrackingEnabled = false

export let sourcegraphRepoSearchToggled = false

export let repositorySearchEnabled = false

export let repositoryFileTreeEnabled = false

interface UrlCache {
    [key: string]: string
}

export const repoUrlCache: UrlCache = {}

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
    // HACK (@kingy): If no urls are passed in return true since the default URL is sourcegraph.com.
    // this fixes safari from failing after install.
    if (!urls) {
        return true
    }
    return !urls.some(url => url !== 'https://sourcegraph.com')
}

export function checkIsOnlySourcegraphDotCom(handler: (res: boolean) => void): void {
    if (window.SG_ENV === 'EXTENSION') {
        storage.getSync(items => handler(isOnlySourcegraphDotCom(items.serverUrls)))
    } else {
        handler(false)
    }
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
    'bash', // Bash
    'clojure', // Clojure
    'cpp', // C++
    'cs', // C#
    'css', // CSS
    'elixir', // Elixir
    'html', // HTML
    'lua', // Lua
    'ocaml', // OCaml
    'r', // R
    'ruby', // Ruby
    'rust', // Rust
])

/**
 * supportedFilenames are the filenames
 * the extension will apply annotations to
 */
export const supportedFilenames = new Set<string>(['Dockerfile'])

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
        case 'sh':
        case 'bash':
        case 'zsh':
            return 'bash'
        case 'clj':
        case 'cljs':
        case 'cljx':
            return 'clojure'
        case 'c':
        case 'cc':
        case 'cpp':
        case 'c++':
        case 'h++':
        case 'hh':
        case 'h':
            return 'cpp'
        case 'cs':
        case 'csx':
            return 'cs'
        case 'css':
            return 'css'
        case 'ex':
        case 'exs':
            return 'elixir'
        case 'htm':
        case 'html':
        case 'xhtml':
            return 'html'
        case 'lua':
        case 'fcgi':
        case 'nse':
        case 'pd_lua':
        case 'rbxs':
        case 'wlua':
            return 'lua'
        case 'ml':
        case 'eliom':
        case 'eliomi':
        case 'ml4':
        case 'mli':
        case 'mll':
        case 'mly':
            return 'ocaml'
        case 'r':
        case 'rd':
        case 'rsx':
            return 'r'
        case 'rb':
        case 'builder':
        case 'eye':
        case 'fcgi':
        case 'gemspec':
        case 'god':
        case 'jbuilder':
        case 'mspec':
        case 'pluginspec':
        case 'podspec':
        case 'rabl':
        case 'rake':
        case 'rbuild':
        case 'rbw':
        case 'rbx':
        case 'ru':
        case 'ruby':
        case 'spec':
        case 'thor':
        case 'watchr':
            return 'ruby'
        case 'rs':
        case 'rs.in':
            return 'rust'
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

export function getPlatformName():
    | 'phabricator-integration'
    | 'safari-extension'
    | 'firefox-extension'
    | 'chrome-extension' {
    if (window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return 'phabricator-integration'
    }

    if (typeof window.safari !== 'undefined') {
        return 'safari-extension'
    }

    return isFirefoxExtension() ? 'firefox-extension' : 'chrome-extension'
}

export function getExtensionVersionSync(): string {
    return runtime.getExtensionVersionSync()
}

export function getExtensionVersion(): Promise<string> {
    return runtime.getExtensionVersion()
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
