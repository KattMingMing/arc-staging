export type RepoLocations = { [key: string]: string }

export interface PhabricatorMapping {
    callsign: string
    path: string
}

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
    repoLocations: RepoLocations
    phabricatorMappings: PhabricatorMapping[]
}

export const defaultStorageItems: StorageItems = {
    sourcegraphURL: 'https://sourcegraph.com',
    serverUrls: ['https://sourcegraph.com'],
    gitHubEnterpriseURL: '',
    phabricatorURL: '',
    repositoryFileTreeEnabled: true,
    repositorySearchEnabled: true,
    sourcegraphRepoSearchToggled: true,
    eventTrackingEnabled: true,
    openEditorEnabled: false,
    identity: '',
    enterpriseUrls: [],
    serverUserId: '',
    hasSeenServerModal: false,
    repoLocations: {},
    phabricatorMappings: [],
}

export type StorageChange = { [key in keyof StorageItems]: chrome.storage.StorageChange }
