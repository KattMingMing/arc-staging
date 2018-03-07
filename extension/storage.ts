import browser from './browser'

export interface StorageItems {
    sourcegraphURL: string
    gitHubEnterpriseURL: string
    phabricatorURL: string
    repositoryFileTreeEnabled: boolean
    repositorySearchEnabled: boolean
    sourcegraphRepoSearchToggled: boolean
    eventTrackingEnabled: boolean
    openEditorEnabled: boolean
    identity: string
    serverUrls: string[]
    serverUserId: string
}

export interface Storage {
    getSync: (callback: (items: StorageItems) => void) => void
    getSyncItem: (key: keyof StorageItems, callback: (items: StorageItems) => void) => void
    setSync: (items: Partial<StorageItems>, callback?: (() => void) | undefined) => void
    getLocal: (callback: (items: StorageItems) => void) => void
    getLocalItem: (key: keyof StorageItems, callback: (items: StorageItems) => void) => void
    setLocal: (items: Partial<StorageItems>, callback?: (() => void) | undefined) => void
    onChanged: (
        listener: (changes: { [key in keyof StorageItems]: browser.storage.StorageChange }, areaName: string) => void
    ) => void
}

const get = (area: browser.storage.StorageArea) => (callback: (items: StorageItems) => void) => area.get(callback)
const set = (area: browser.storage.StorageArea) => (items: Partial<StorageItems>, callback?: () => void) =>
    area.set(items, callback)

const getItem = (area: browser.storage.StorageArea) => (
    key: keyof StorageItems,
    callback: (items: StorageItems) => void
) => area.get(key, callback)

const noop = () => {
    /* noop */
}

export default ((): Storage => {
    if (window.SG_ENV === 'EXTENSION') {
        return {
            getSync: get(browser.storage.sync),
            getSyncItem: getItem(browser.storage.sync),
            setSync: set(browser.storage.sync),

            onChanged: (
                listener: (
                    changes: { [key in keyof StorageItems]: browser.storage.StorageChange },
                    areaName: string
                ) => void
            ) => {
                browser.storage.onChanged.addListener(listener)
            },

            getLocal: get(browser.storage.local),
            getLocalItem: getItem(browser.storage.local),
            setLocal: set(browser.storage.local),
        }
    }

    // Running natively in the webpage(in Phabricator patch) so we don't need any storage.
    return {
        getSync: noop,
        getSyncItem: noop,
        setSync: noop,
        onChanged: noop,
        getLocal: noop,
        getLocalItem: noop,
        setLocal: noop,
    }
})()
