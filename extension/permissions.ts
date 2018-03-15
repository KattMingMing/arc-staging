import browser from './browser'

// Safari doesn't support optional permissions so we have access to every site
const safari = window.safari

export function contains(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        browser.permissions.contains({ origins: [url + '/*'] }, resolve)
    })
}

export function request(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (browser && browser.permissions) {
            browser.permissions.request(
                {
                    origins: [url + '/*'],
                },
                resolve
            )
        } else if (safari) {
            resolve(true)
        }
    })
}

export function remove(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (browser && browser.permissions) {
            browser.permissions.remove(
                {
                    origins: [url + '/*'],
                },
                resolve
            )
        } else if (safari) {
            resolve(true)
        }
    })
}

export function getAll(): Promise<browser.permissions.Permissions> {
    return new Promise(resolve => {
        if (browser && browser.permissions) {
            browser.permissions.getAll(resolve)
            return
        }

        // make sure we properly handle this on safari
        throw Error('SAFARI permissions.getAll not supported')
    })
}

export function onAdded(listener: (p: browser.permissions.Permissions) => void): void {
    if (browser && browser.permissions && browser.permissions.onAdded) {
        browser.permissions.onAdded.addListener(listener)
    }
}

export function onRemoved(listener: (p: browser.permissions.Permissions) => void): void {
    if (browser && browser.permissions && browser.permissions.onRemoved) {
        browser.permissions.onRemoved.addListener(listener)
    }
}
