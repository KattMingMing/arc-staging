import { omitBy, uniq, xor } from 'lodash'
import 'rxjs/add/observable/from'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'

import storage from '../../extension/storage'
import { RepoLocations } from '../../extension/types'
import { serverUrls, sourcegraphUrl } from '../util/context'

interface UrlChoices {
    sourcegraphUrl: string
    serverUrls: string[]
    repoLocations: RepoLocations
}

function getServerUrlChoices(): Observable<UrlChoices> {
    if (window.SG_ENV === 'PAGE') {
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
            [CURRENT_SG_URL_KEY]: sourcegraphUrl,
        }

        if (window.SG_ENV === 'PAGE') {
            return
        }

        storage.getSync(({ repoLocations }) => {
            this.cache = repoLocations
        })

        storage.onChanged(({ serverUrls }) => {
            if (!serverUrls) {
                return
            }

            if (!serverUrls.oldValue && !serverUrls.newValue) {
                return
            }

            if (xor(serverUrls.oldValue, serverUrls.newValue).length > 0) {
                // Theres a diff, make sure the cache only contains urls in our list.
                this.cleanCache(serverUrls.newValue)
            }
        })
    }

    private cleanCache(urls: string[]): void {
        const valid: { [key: string]: boolean } = {}
        for (const url of urls) {
            valid[url] = true
        }

        this.cache = omitBy(this.cache, url => !valid[url])

        storage.getSync(({ repoLocations }) =>
            storage.setSync({
                repoLocations: omitBy<{}, RepoLocations>(repoLocations, (url: string) => !valid[url]),
            })
        )
    }

    /**
     * getUrls returns an observable with a list of urls ordered by the confidence that the repo is at the url.
     * This should be the default api for getting urls to try.
     */
    public getUrls(key: string): Observable<string[]> {
        if (key === '' || window.SG_ENV === 'PAGE') {
            return Observable.from([[this.getUrl(CURRENT_SG_URL_KEY)]])
        }

        const localCachedUrl = this.cache[key]
        if (key !== '' && localCachedUrl) {
            this.setUrl('', localCachedUrl)

            return Observable.from([[localCachedUrl]])
        }

        return getServerUrlChoices().map(choices => {
            const cachedUrl = choices.repoLocations[key]
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
        if (key === '' || window.SG_ENV === 'PAGE') {
            return this.cache[CURRENT_SG_URL_KEY]!
        }

        const url = this.cache[key]

        if (url) {
            return url
        }

        throw new Error(
            `RepoCache.prototype.getUrl called for key ${key} without confidence. Use RepoCache.prototype.getUrls instead.`
        )
    }

    public setUrl(key: string, url: string): void {
        if (window.SG_ENV === 'PAGE') {
            return
        }

        if (key === '') {
            this.cache[CURRENT_SG_URL_KEY] = url
            return
        }

        this.cache[key] = url

        storage.getSync(({ repoLocations }) => storage.setSync({ repoLocations: { ...repoLocations, [key]: url } }))
    }
}

export const repoCache = new RepoCache()
