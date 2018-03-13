import browser from './browser'
import SafariStorageArea, { SafariSettingsChangeMessage, stringifyStorageArea } from './safari/StorageArea'
import { StorageChange, StorageItems } from './types'

export interface Storage {
    getSync: (callback: (items: StorageItems) => void) => void
    getSyncItem: (key: keyof StorageItems, callback: (items: StorageItems) => void) => void
    setSync: (items: Partial<StorageItems>, callback?: (() => void) | undefined) => void
    getLocal: (callback: (items: StorageItems) => void) => void
    getLocalItem: (key: keyof StorageItems, callback: (items: StorageItems) => void) => void
    setLocal: (items: Partial<StorageItems>, callback?: (() => void) | undefined) => void
    onChanged: (listener: (changes: Partial<StorageChange>, areaName: string) => void) => void
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
        const syncStorageArea: browser.storage.StorageArea =
            browser && browser.storage
                ? browser.storage.sync
                : new SafariStorageArea((safari.extension as SafariExtension).settings, 'sync')

        const localStorageArea: browser.storage.StorageArea =
            browser && browser.storage
                ? browser.storage.local
                : new SafariStorageArea(stringifyStorageArea(window.localStorage), 'local')

        return {
            getSync: get(syncStorageArea),
            getSyncItem: getItem(syncStorageArea),
            setSync: set(syncStorageArea),

            getLocal: get(localStorageArea),
            getLocalItem: getItem(localStorageArea),
            setLocal: set(localStorageArea),

            onChanged: (listener: (changes: Partial<StorageChange>, areaName: string) => void) => {
                if (browser && browser.storage) {
                    browser.storage.onChanged.addListener(listener)
                } else if (safari && safari.application) {
                    const extension = safari.extension as SafariExtension

                    extension.settings.addEventListener(
                        'change',
                        ({ key, newValue, oldValue }: SafariExtensionSettingsChangeEvent) => {
                            const k = key as keyof StorageItems

                            listener({ [k]: { newValue, oldValue } }, 'sync')
                        }
                    )
                } else if (safari && !safari.application) {
                    const page = safari.self as SafariContentWebPage

                    const handleChanges = (event: SafariExtensionMessageEvent) => {
                        if (event.name === 'settings-change') {
                            const { changes, areaName } = event.message as SafariSettingsChangeMessage
                            const c = changes as { [key in keyof StorageItems]: browser.storage.StorageChange }

                            listener(c, areaName)
                        }
                    }

                    page.addEventListener('message', handleChanges, false)
                }
            },
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
