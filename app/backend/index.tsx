import { doFetch as fetch } from "app/backend/xhr";
import { sourcegraphUrl } from "app/util/context";

export const cacheKey = (repo: string, rev?: string) => `${repo}@${rev || null}`;

export interface ResolvedRevResp {
	notFound?: boolean;
	cloneInProgress?: boolean;
	commitID?: string;
	defaultBranch?: string;
}

const promiseCache = new Map<string, Promise<ResolvedRevResp>>();

export function resolveRev(repo: string, rev?: string): Promise<ResolvedRevResp> {
	const key = cacheKey(repo, rev);
	const promiseHit = promiseCache.get(key);
	if (promiseHit) {
		return promiseHit;
	}
	const body = {
		query: `query Content($repo: String, $rev: String) {
					root {
						repository(uri: $repo) {
							defaultBranch
							commit(rev: $rev) {
								cloneInProgress,
								commit {
									sha1
								}
							}
						}
					}
				}`,
		variables: { repo, rev },
	};
	const p = fetch(`${sourcegraphUrl}/.api/graphql`, {
		method: "POST",
		body: JSON.stringify(body),
	}).then((resp) => resp.json()).then((json: any) => {
		// Note: only cache the promise if it is not found or found. If it is cloning, we want to recheck.
		promiseCache.delete(key);
		if (!json.data) {
			const error = new Error("invalid response received from graphql endpoint");
			promiseCache.set(key, Promise.reject(error));
			throw error;
		}
		if (!json.data.root.repository) {
			const notFound = { notFound: true };
			promiseCache.set(key, Promise.resolve(notFound));
			return notFound;
		}
		if (json.data.root.repository.commit.cloneInProgress) {
			// don't store this promise, we want to make a new query, holmes.
			return { cloneInProgress: true };
		} else if (!json.data.root.repository.commit.commit) {
			const error = new Error("not able to resolve sha1");
			promiseCache.set(key, Promise.reject(error));
			throw error;
		}
		const found = { commitID: json.data.root.repository.commit.commit.sha1, defaultBranch: json.data.root.repository.defaultBranch };
		promiseCache.set(key, Promise.resolve(found));
		return found;
	});
	promiseCache.set(key, p);
	return p;
}

export interface ResolvedSearchTextResp {
	results?: [{ [key: string]: any }];
	notFound?: boolean;
}

const searchPromiseCache = new Map<string, Promise<ResolvedSearchTextResp>>();

export function searchText(uri: string, query: string): Promise<ResolvedSearchTextResp> {
	const key = cacheKey(uri, query);
	const promiseHit = searchPromiseCache.get(key);
	if (promiseHit) {
		return promiseHit;
	}
	const variables = {
		pattern: query,
		fileMatchLimit: 10000,
		isRegExp: false,
		isWordMatch: false,
		repositories: [{ repo: uri, rev: "" }],
		isCaseSensitive: false,
		includePattern: "",
		excludePattern: "{.git,**/.git,.svn,**/.svn,.hg,**/.hg,CVS,**/CVS,.DS_Store,**/.DS_Store,node_modules,bower_components,vendor,dist,out,Godeps,third_party}",
	};

	const body = {
		query: `query SearchText(
			$pattern: String!,
			$fileMatchLimit: Int!,
			$isRegExp: Boolean!,
			$isWordMatch: Boolean!,
			$repositories: [RepositoryRevision!]!,
			$isCaseSensitive: Boolean!,
			$includePattern: String!,
			$excludePattern: String!,
		) {
			root {
				searchRepos(
					repositories: $repositories,
					query: {
						pattern: $pattern,
						isRegExp: $isRegExp,
						fileMatchLimit: $fileMatchLimit,
						isWordMatch: $isWordMatch,
						isCaseSensitive: $isCaseSensitive,
						includePattern: $includePattern,
						excludePattern: $excludePattern,
				}) {
					limitHit
					results {
						resource
						limitHit
						lineMatches {
							preview
							lineNumber
							offsetAndLengths
						}
					}
				}
			}
		}`,
		variables: variables,
	};

	const p = fetch(`${sourcegraphUrl}/.api/graphql`, {
		method: "POST",
		body: JSON.stringify(body),
	}).then((resp) => resp.json()).then((json: any) => {
		searchPromiseCache.delete(key);
		const results = json.data && json.data.root!.searchRepos;
		if (!results) {
			const notFound = { notFound: true };
			promiseCache.set(key, Promise.resolve(notFound));
			return notFound;
		}

		searchPromiseCache.set(key, Promise.resolve(results));
		return results;
	});

	searchPromiseCache.set(key, p);
	return p;
}

export interface FileTreeResp {
	results?: [{ name: string }];
	notFound?: boolean;
}

const fileTreeCache = new Map<string, Promise<FileTreeResp>>();

export function listAllFiles(repo: string, revision: string): Promise<FileTreeResp> {
	const key = cacheKey(repo, revision);
	const promiseHit = fileTreeCache.get(key);
	if (promiseHit) {
		return promiseHit;
	}

	const body = {
		query: `query FileTree($repo: String!, $revision: String!) {
			root {
				repository(uri: $repo) {
					commit(rev: $revision) {
						commit {
							tree(recursive: true) {
								files {
									name
								}
							}
						}
					}
				}
			}
		}`,
		variables: { repo, revision },
	};
	const p = fetch(`${sourcegraphUrl}/.api/graphql`, {
		method: "POST",
		body: JSON.stringify(body),
	}).then(resp => resp.json()).then((json: any) => {
		fileTreeCache.delete(key);
		if (!json.data) {
			const error = new Error("invalid response received from graphql endpoint");
			throw error;
		}
		if (!json.data.root.repository || !json.data.root.repository.commit || !json.data.root.repository.commit.commit || !json.data.root.repository.commit.commit.tree || !json.data.root.repository.commit.commit.tree.files) {
			const notFound = { notFound: true };
			fileTreeCache.set(key, Promise.resolve(notFound));
			return notFound;
		}
		const results = { results: json.data.root.repository.commit.commit.tree.files };
		fileTreeCache.set(key, Promise.resolve(results));
		return results;
	});

	fileTreeCache.set(key, p);
	return p;
}
