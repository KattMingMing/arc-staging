import { omit, omitBy, uniq, xor } from 'lodash'
import 'rxjs/add/observable/from'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'

import storage from '../../extension/storage'
import { RepoLocations } from '../../extension/types'
import { isBackground, isInPage } from '../context'
import { serverUrls, sourcegraphUrl } from '../util/context'

interface UrlChoices {
    sourcegraphUrl: string
    serverUrls: string[]
    repoLocations: RepoLocations
}

function getServerUrlChoices(): Observable<UrlChoices> {
    if (isInPage) {
        return Observable.from([{ sourcegraphUrl, serverUrls, repoLocations: {} }])
    }

    return Observable.create(observer =>
        storage.getSync(({ serverUrls, sourcegraphURL, repoLocations }) =>
            observer.next({ serverUrls, sourcegraphUrl: sourcegraphURL, repoLocations })
        )
    )
}

// Not all graphql requests will happen within the context of a repo.
// For these, we will get an empty string. cache[''] will always be set
// to the current sourcegraphURL in storage.
const CURRENT_SG_URL_KEY = 'SG_URL'

class RepoCache {
    private cache: RepoLocations

    constructor() {
        this.cache = {
            [CURRENT_SG_URL_KEY]: sourcegraphUrl || 'https://sourcegraph.com',
        }

        if (isInPage) {
            return
        }

        storage.getSync(({ repoLocations, sourcegraphURL }) => {
            if (repoLocations) {
                this.cache = {
                    ...repoLocations,
                }
            }

            if (isBackground) {
                this.setCurrentUrl(sourcegraphURL)
            }
        })

        storage.onChanged(({ serverUrls, repoLocations }) => {
            if (!serverUrls) {
                return
            }

            const oldValue = serverUrls.oldValue || []
            const newValue = serverUrls.newValue || []

            if (xor(oldValue, newValue).length > 0 && oldValue.length > newValue.length) {
                // Theres a diff, make sure the cache only contains urls in our list.
                this.cleanCache(serverUrls.newValue)
            }
        })
    }

    private getCurrentUrl(): string {
        return this.cache[CURRENT_SG_URL_KEY]
    }

    private setCurrentUrl(url = 'https://sourcegraph.com'): void {
        this.cache[CURRENT_SG_URL_KEY] = url
    }

    private cleanCache(urls: string[]): void {
        const valid: { [key: string]: boolean } = {}
        for (const url of urls) {
            valid[url] = true
        }

        const wasRemoved = (url: string) => !valid[url]

        this.cache = omitBy(this.cache, wasRemoved)

        storage.getSync(({ repoLocations, sourcegraphURL }) => {
            storage.setSync({
                repoLocations: omitBy<{}, RepoLocations>(repoLocations, wasRemoved),
            })

            if (sourcegraphURL !== this.getCurrentUrl()) {
                this.setCurrentUrl(sourcegraphURL)
            }
        })
    }

    /**
     * getUrls returns an observable with a list of urls ordered by the confidence that the repo is at the url.
     * This should be the default api for getting urls to try.
     */
    public getUrls(key: string): Observable<string[]> {
        if (key === '' || isInPage) {
            return Observable.from([[this.getCurrentUrl()]])
        }

        const localCachedUrl = this.cache[key]
        if (key !== '' && localCachedUrl) {
            this.setUrl('', localCachedUrl)

            // If it's in memory, we can confidently say it's the correct match.
            return Observable.from([[localCachedUrl]])
        }

        return getServerUrlChoices().map(choices => {
            const cachedUrl = this.cache[key] || choices.repoLocations[key]
            if (cachedUrl) {
                return uniq([cachedUrl, choices.sourcegraphUrl, ...choices.serverUrls])
            }

            return uniq([choices.sourcegraphUrl, ...choices.serverUrls])
        })
    }

    /**
     * getUrl returns a url from the instance's cache. This should only be used if we are
     * sure we already know where the repo is.
     *
     * Ex: Page loads, revision is resolved via graphql which will call `setUrl`
     * for us, thus we know the location.
     */
    public getUrl(key: string): string {
        if (key === '' || isInPage) {
            return this.getCurrentUrl()
        }

        const url = this.cache[key]

        if (url) {
            return url
        }

        // We couldn't find anything. Just try the current sourcegraphUrl.
        // A lot of dependencies to repos we are looking at will come through here.
        return this.getCurrentUrl()
    }

    /**
     * setUrl sets a url for a given repo. You should call this for requests
     * where RequestContext.isRepoSpecific === true AND we successfully resolved
     * a URL for repo.
     */
    public setUrl(key: string, url: string): void {
        if (isInPage) {
            return
        }

        if (key === '') {
            this.setCurrentUrl(url)
            return
        }

        this.cache[key] = url

        storage.getSync(({ repoLocations }) => storage.setSync({ repoLocations: { ...repoLocations, [key]: url } }))
    }

    public removeUrlForKey(key: string): void {
        this.cache = omit(this.cache, key)

        if (isInPage) {
            return
        }

        storage.getSync(({ repoLocations, sourcegraphURL }) =>
            storage.setSync({
                repoLocations: omit<{}, RepoLocations>(repoLocations, key),
            })
        )
    }
}

export const repoCache = new RepoCache()
