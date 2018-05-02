export function getHeaders(): { [name: string]: string } | undefined {
    if (window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return undefined
    }
    return undefined
}
