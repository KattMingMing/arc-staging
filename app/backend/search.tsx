import { debounceTime } from 'rxjs/operators/debounceTime'
import { distinctUntilChanged } from 'rxjs/operators/distinctUntilChanged'
import { filter } from 'rxjs/operators/filter'
import { map } from 'rxjs/operators/map'
import { mergeMap } from 'rxjs/operators/mergeMap'
import { publishReplay } from 'rxjs/operators/publishReplay'
import { refCount } from 'rxjs/operators/refCount'
import { repeat } from 'rxjs/operators/repeat'
import { switchMap } from 'rxjs/operators/switchMap'
import { take } from 'rxjs/operators/take'
import { toArray } from 'rxjs/operators/toArray'
import { Subject } from 'rxjs/Subject'
import { queryGraphQL } from './graphql'

interface BaseSuggestion {
    title: string
    description?: string

    /**
     * The URL that is navigated to when the user selects this
     * suggestion.
     */
    url: string

    /**
     * A label describing the action taken when navigating to
     * the URL (e.g., "go to repository").
     */
    urlLabel: string
}

interface SymbolSuggestion extends BaseSuggestion {
    type: 'symbol'
    kind: string
}

interface RepoSuggestion extends BaseSuggestion {
    type: 'repo'
}

interface FileSuggestion extends BaseSuggestion {
    type: 'file'
}

interface DirSuggestion extends BaseSuggestion {
    type: 'dir'
}

export type Suggestion = SymbolSuggestion | RepoSuggestion | FileSuggestion | DirSuggestion

/**
 * Returns all but the last element of path, or "." if that would be the empty path.
 */
function dirname(path: string): string | undefined {
    return (
        path
            .split('/')
            .slice(0, -1)
            .join('/') || '.'
    )
}

/**
 * Returns the last element of path, or "." if path is empty.
 */
function basename(path: string): string {
    return path.split('/').slice(-1)[0] || '.'
}

export function createSuggestion(item: GQL.SearchSuggestion): Suggestion | null {
    switch (item.__typename) {
        case 'Repository': {
            return {
                type: 'repo',
                title: item.uri,
                url: `/${item.uri}`,
                urlLabel: 'go to repository',
            }
        }
        case 'File': {
            const descriptionParts: string[] = []
            const dir = dirname(item.path)
            if (dir !== undefined && dir !== '.') {
                descriptionParts.push(`${dir}/`)
            }
            descriptionParts.push(basename(item.repository.uri))
            if (item.isDirectory) {
                return {
                    type: 'dir',
                    title: item.name,
                    description: descriptionParts.join(' — '),
                    url: item.url,
                    urlLabel: 'go to dir',
                }
            }
            return {
                type: 'file',
                title: item.name,
                description: descriptionParts.join(' — '),
                url: item.url,
                urlLabel: 'go to file',
            }
        }
        case 'Symbol': {
            return {
                type: 'symbol',
                kind: item.kind,
                title: item.name,
                description: `${item.containerName || item.location.resource.path} — ${basename(
                    item.location.resource.repository.uri
                )}`,
                url: item.url,
                urlLabel: 'go to definition',
            }
        }
        default:
            return null
    }
}

export interface SearchOptions {
    /** The query entered by the user */
    query: string
}

export interface ErrorLike {
    message?: string
    code?: string
}

export const isErrorLike = (val: any): val is ErrorLike =>
    !!val && typeof val === 'object' && (!!val.stack || ('message' in val || 'code' in val))

/**
 * Converts an ErrorLike to a proper Error if needed, copying all properties
 * @param errorLike An Error or object with ErrorLike properties
 */
export const asError = (errorLike: ErrorLike): Error =>
    errorLike instanceof Error ? errorLike : Object.assign(new Error(errorLike.message), errorLike)

/**
 * An Error that aggregates multiple errors
 */
export interface AggregateError extends Error {
    name: 'AggregateError'
    errors: Error[]
}

/**
 * Creates an aggregate error out of multiple provided error likes
 *
 * @param errors The errors or ErrorLikes to aggregate
 */
const createAggregateError = (errors: ErrorLike[] = []): AggregateError =>
    Object.assign(new Error(errors.map(e => e.message).join('\n')), {
        name: 'AggregateError' as 'AggregateError',
        errors: errors.map(asError),
    })

export const fetchSuggestions = (options: SearchOptions) =>
    queryGraphQL(
        { repoKey: '' },
        `
            query SearchSuggestions($query: String!, $first: Int!) {
                search(query: $query) {
                    suggestions(first: $first) {
                        ... on Repository {
                            __typename
                            uri
                        }
                        ... on File {
                            __typename
                            path
                            name
                            isDirectory
                            url
                            repository {
                                uri
                            }
                        }
                        ... on Symbol {
                            __typename
                            name
                            containerName
                            url
                            kind
                            location {
                                resource {
                                    path
                                    repository {
                                        uri
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `,
        {
            query: options.query,
            // The browser extension API only takes 5 suggestions
            first: 5,
        }
    ).pipe(
        mergeMap(({ data, errors }) => {
            if (!data || !data.search || !data.search.suggestions) {
                throw createAggregateError(errors)
            }
            return data.search.suggestions
        })
    )

interface SuggestionInput {
    query: string
    handler: (suggestion: Suggestion[]) => void
}

export const createSuggestionFetcher = () => {
    const fetcher = new Subject<SuggestionInput>()

    fetcher
        .pipe(
            distinctUntilChanged(),
            debounceTime(200),
            switchMap(({ query, handler }) => {
                if (query.length < 2) {
                    return [
                        {
                            suggestions: [],
                            suggestHandler: handler,
                        },
                    ]
                }
                const options: SearchOptions = {
                    query,
                }
                return fetchSuggestions(options).pipe(
                    take(5),
                    map(createSuggestion),
                    // createSuggestion will return null if we get a type we don't recognize
                    filter(f => !!f),
                    toArray(),
                    map((suggestions: Suggestion[]) => ({
                        suggestions,
                        suggestHandler: handler,
                    })),
                    publishReplay(),
                    refCount()
                )
            }),
            // But resubscribe afterwards
            repeat()
        )
        .subscribe(({ suggestions, suggestHandler }) => suggestHandler(suggestions))

    return (input: SuggestionInput) => fetcher.next(input)
}
