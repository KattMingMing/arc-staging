import browser from './browser'

export function contains(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        browser.permissions.contains({ origins: [url + '/*'] }, resolve)
    })
}
export function request(url: string): Promise<boolean> {
    return new Promise((resolve, reject) =>
        browser.permissions.request(
            {
                origins: [url + '/*'],
            },
            resolve
        )
    )
}

export function getAll(): Promise<browser.permissions.Permissions> {
    return new Promise(resolve => browser.permissions.getAll(resolve))
}

export function onAdded(listener: (p: browser.permissions.Permissions) => void): void {
    if (browser.permissions.onAdded) {
        browser.permissions.onAdded.addListener(listener)
    }
}

export function onRemoved(listener: (p: browser.permissions.Permissions) => void): void {
    if (browser.permissions.onRemoved) {
        browser.permissions.onRemoved.addListener(listener)
    }
}
