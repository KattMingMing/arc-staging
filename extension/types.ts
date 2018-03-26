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
    enterpriseUrls: string[]
    serverUserId: string
    hasSeenServerModal: boolean
}

export const defaultStorageItems: StorageItems = {
    sourcegraphURL: 'https://sourcegraph.com',
    gitHubEnterpriseURL: '',
    phabricatorURL: '',
    repositoryFileTreeEnabled: true,
    repositorySearchEnabled: true,
    sourcegraphRepoSearchToggled: true,
    eventTrackingEnabled: true,
    openEditorEnabled: false,
    identity: '',
    serverUrls: [],
    enterpriseUrls: [],
    serverUserId: '',
    hasSeenServerModal: false,
}

export type StorageChange = { [key in keyof StorageItems]: browser.storage.StorageChange }
