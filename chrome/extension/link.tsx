import * as querystring from 'query-string'

const search = window.location.search
const searchParams = querystring.parse(search)

if (searchParams && searchParams.sourceurl) {
    chrome.storage.sync.get(items => {
        const serverUrls = items.serverUrls || []
        serverUrls.push(searchParams.sourceurl)
        chrome.storage.sync.set({
            serverUrls: [...new Set([...serverUrls, 'https://sourcegraph.com'])],
            serverUserId: searchParams.userId || items.serverUserId,
        })
    })
}
