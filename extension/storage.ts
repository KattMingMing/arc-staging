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

const get = (area: browser.storage.StorageArea) => (callback: (items: StorageItems) => void) => area.get(callback)
const set = (area: browser.storage.StorageArea) => (items: Partial<StorageItems>, callback?: () => void) =>
    area.set(items, callback)

const getItem = (area: browser.storage.StorageArea) => (
    key: keyof StorageItems,
    callback: (items: StorageItems) => void
) => area.get(key, callback)

export const getSync = get(browser.storage.sync)
export const getSyncItem = getItem(browser.storage.sync)
export const setSync = set(browser.storage.sync)

export const onChanged = (
    listener: (changes: { [key in keyof StorageItems]: browser.storage.StorageChange }, areaName: string) => void
) => {
    browser.storage.onChanged.addListener(listener)
}

export const getLocal = get(browser.storage.local)
export const getLocalItem = getItem(browser.storage.local)
export const setLocal = set(browser.storage.local)
