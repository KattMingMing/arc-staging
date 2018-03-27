// tslint:disable
// graphql typescript definitions

declare namespace GQL {
    interface IGraphQLResponseRoot {
        data?: IQuery | IMutation
        errors?: Array<IGraphQLResponseError>
    }

    interface IGraphQLResponseError {
        message: string // Required for all errors
        locations?: Array<IGraphQLResponseErrorLocation>
        [propName: string]: any // 7.2.2 says 'GraphQL servers may provide additional entries to error'
    }

    interface IGraphQLResponseErrorLocation {
        line: number
        column: number
    }

    interface IQuery {
        __typename: 'Query'
        root: IQuery
        node: Node | null
        repository: IRepository | null
        phabricatorRepo: IPhabricatorRepo | null
        currentUser: IUser | null
        /**
    description: Look up a user by username.
  */
        user: IUser | null
        /**
    description: Look up an organization by name.
  */
        organization: IOrg | null
        currentSiteSettings: ISettings | null
        configuration: IConfigurationCascade
        search: ISearch | null
        searchScopes: Array<ISearchScope>
        /**
    description: All saved queries configured for the current user, merged from all configurations.
  */
        savedQueries: Array<ISavedQuery>
        /**
    description: All repository groups for the current user, merged from all configurations.
  */
        repoGroups: Array<IRepoGroup>
        org: IOrg
        sharedItem: ISharedItem | null
        /**
    description: The current site.
  */
        site: ISite
    }

    type Node = IRepository | IGitCommit | IPackage | IDependency | IGitRef | IUser | IOrg | IThread

    interface INode {
        __typename: 'Node'
        id: string
    }

    /**
    description: A repository is a Git source control repository that is mirrored from some origin code host.
  */
    interface IRepository {
        __typename: 'Repository'
        /**
    description: The repository's unique ID.
  */
        id: string
        /**
    description:  The repository's name, as a path with one or more components. It conventionally consists of
 the repository's hostname and path (joined by "/"), minus any suffixes (such as ".git").

 Examples:

 - github.com/foo/bar
 - my-code-host.example.com/myrepo
 - myrepo
  */
        uri: string
        /**
    description: The repository's description.
  */
        description: string
        /**
    description: The primary programming language in the repository.
  */
        language: string
        /**
    description:  Whether the repository is enabled. A disabled repository should only be accessible to site admins.

 NOTE: Disabling a repository does not provide any additional security. This field is merely a
 guideline to UI implementations.
  */
        enabled: boolean
        /**
    description: The date when this repository was created on Sourcegraph.
  */
        createdAt: string
        /**
    description: The date when this repository's metadata was last updated on Sourcegraph.
  */
        updatedAt: string | null
        /**
    description: Returns information about the given commit in the repository.
  */
        commit: IGitCommit | null
        /**
    description: Information and status related to mirroring, if this repository is a mirror of another repository (e.g., on
some code host). In this case, the remote source repository is external to Sourcegraph and the mirror is
maintained by the Sourcegraph site (not the other way around).
  */
        mirrorInfo: IMirrorRepositoryInfo
        /**
    description: Information about this repository from the external service that it originates from (such as GitHub, GitLab,
Phabricator, etc.).
  */
        externalRepository: IExternalRepository | null
        /**
    description: Whether the repository is currently being cloned.
  */
        cloneInProgress: boolean
        /**
    description: The commit that was last indexed for cross-references, if any.
  */
        lastIndexedRevOrLatest: IGitCommit | null
        /**
    description: The repository's default Git branch. If the repository is currently being cloned or is empty,
this field will be null.
  */
        defaultBranch: string | null
        /**
    description: Information about the text search index for this repository, or null if text search indexing
is not enabled or supported for this repository.
  */
        textSearchIndex: IRepositoryTextSearchIndex | null
        /**
    description: The URL to this repository.
  */
        url: string
        /**
    description: The URL specifying where to view the repository at an external location.
  */
        externalURL: string | null
        /**
    description: The type of code host that hosts this repository at its external url (e.g. GitHub, Phabricator).
  */
        hostType: string | null
        /**
    description: The repository's Git refs.
  */
        gitRefs: IGitRefConnection
        /**
    description: The repository's Git branches.
  */
        branches: IGitRefConnection
        /**
    description: The repository's Git tags.
  */
        tags: IGitRefConnection
        /**
    description:  The repository's symbols (e.g., functions, variables, types, classes, etc.) on the default branch.

 The result may be stale if a new commit was just pushed to this repository's default branch and it has not
 yet been processed. Use Repository.commit.tree.symbols to retrieve symbols for a specific revision.
  */
        symbols: ISymbolConnection
        /**
    description:  Packages defined in this repository, as returned by LSP workspace/xpackages requests to this repository's
 language servers (running against a recent commit on its default branch).

 The result may be stale if a new commit was just pushed to this repository's default branch and it has not
 yet been processed. Use Repository.commit.packages to retrieve packages for a specific revision.
  */
        packages: IPackageConnection
        /**
    description:  Dependencies of this repository, as returned by LSP workspace/xreferences requests to this repository's
 language servers (running against a recent commit on its default branch).

 The result may be stale if a new commit was just pushed to this repository's default branch and it has not
 yet been processed. Use Repository.commit.dependencies to retrieve dependencies for a specific revision.
  */
        dependencies: IDependencyConnection
        listTotalRefs: ITotalRefList
        /**
    description: Link to another Sourcegraph instance location where this repository is located.
  */
        redirectURL: string | null
        /**
    description: Whether the viewer has admin privileges on this repository.
  */
        viewerCanAdminister: boolean
    }

    /**
    description: A Git commit.
  */
    interface IGitCommit {
        __typename: 'GitCommit'
        /**
    description: The globally addressable ID for this commit.
  */
        id: string
        /**
    description: The repository that contains this commit.
  */
        repository: IRepository
        /**
    description: This commit's Git object ID (OID), a 40-character SHA-1 hash.
  */
        oid: any
        /**
    description: The abbreviated form of this commit's OID.
  */
        abbreviatedOID: string
        /**
    description: This commit's author.
  */
        author: ISignature
        /**
    description: This commit's committer, if any.
  */
        committer: ISignature | null
        /**
    description: The full commit message.
  */
        message: string
        /**
    description: The first line of the commit message.
  */
        subject: string
        /**
    description: Lists the Git tree as of this commit.
  */
        tree: ITree | null
        /**
    description: Retrieves a Git blob (file) as of this commit.
  */
        file: IFile | null
        /**
    description: Lists the programming languages present in the tree at this commit.
  */
        languages: Array<string>
        /**
    description: The log of commits consisting of this commit and its ancestors.
  */
        ancestors: IGitCommitConnection
        /**
    description: Symbols defined as of this commit. (All symbols, not just symbols that were newly defined in this commit.)
  */
        symbols: ISymbolConnection
        /**
    description: Packages defined in this repository as of this commit, as returned by LSP workspace/xpackages
requests to this repository's language servers.
  */
        packages: IPackageConnection
        /**
    description: Dependencies of this repository as of this commit, as returned by LSP workspace/xreferences
requests to this repository's language servers.
  */
        dependencies: IDependencyConnection
    }

    interface ISignature {
        __typename: 'Signature'
        person: IPerson | null
        date: string
    }

    interface IPerson {
        __typename: 'Person'
        name: string
        email: string
        /**
    description: The name if set; otherwise the email username.
  */
        displayName: string
        gravatarHash: string
        avatarURL: string
    }

    interface ITree {
        __typename: 'Tree'
        directories: Array<IDirectory>
        files: Array<IFile>
        /**
    description: Consists of directories plus files.
  */
        entries: Array<TreeEntry>
    }

    interface IDirectory {
        __typename: 'Directory'
        /**
    description: The full path (relative to the repository root) of this directory.
  */
        path: string
        /**
    description: The base name (i.e., file name only) of this directory.
  */
        name: string
        /**
    description: True because this is a directory. (The value differs for other TreeEntry interface implementations, such as
File.)
  */
        isDirectory: boolean
        /**
    description: The repository containing this directory.
  */
        repository: IRepository
        /**
    description: The list of Git commits that touched this directory.
  */
        commits: Array<IGitCommit>
        /**
    description: The URL to this directory.
  */
        url: string
        tree: ITree
        /**
    description: Symbols defined in this directory.
  */
        symbols: ISymbolConnection
    }

    /**
    description: A file, directory, or other tree entry.
  */
    type TreeEntry = IDirectory | IFile

    /**
    description: A file, directory, or other tree entry.
  */
    interface ITreeEntry {
        __typename: 'TreeEntry'
        /**
    description: The full path (relative to the repository root) of this tree entry.
  */
        path: string
        /**
    description: The base name (i.e., file name only) of this tree entry.
  */
        name: string
        /**
    description: Whether this tree entry is a directory.
  */
        isDirectory: boolean
        /**
    description: The repository containing this tree entry.
  */
        repository: IRepository
        /**
    description: The list of Git commits that touched this tree entry.
  */
        commits: Array<IGitCommit>
        /**
    description: The URL to this tree entry.
  */
        url: string
        /**
    description: Symbols defined in this file or directory.
  */
        symbols: ISymbolConnection
    }

    /**
    description: A list of symbols.
  */
    interface ISymbolConnection {
        __typename: 'SymbolConnection'
        /**
    description: A list of symbols.
  */
        nodes: Array<ISymbol>
        /**
    description: Pagination information.
  */
        pageInfo: IPageInfo
    }

    /**
    description:  A code symbol (e.g., a function, variable, type, class, etc.).

 It is derived from symbols as defined in the Language Server Protocol (see
 https://microsoft.github.io/language-server-protocol/specification#workspace_symbol).
  */
    interface ISymbol {
        __typename: 'Symbol'
        /**
    description: The name of the symbol.
  */
        name: string
        /**
    description: The name of the symbol that contains this symbol, if any. This field's value is not guaranteed to be
structured in such a way that callers can infer a hierarchy of symbols.
  */
        containerName: string | null
        /**
    description: The kind of the symbol.
  */
        kind: ISymbolKindEnum
        /**
    description: The programming language of the symbol.
  */
        language: string
        /**
    description: The location where this symbol is defined.
  */
        location: ILocation
        /**
    description: The URL of this symbol.
  */
        url: string
    }

    /**
    description: All possible kinds of symbols. This set matches that of the Language Server Protocol
(https://microsoft.github.io/language-server-protocol/specification#workspace_symbol).
  */
    type ISymbolKindEnum =
        | 'UNKNOWN'
        | 'FILE'
        | 'MODULE'
        | 'NAMESPACE'
        | 'PACKAGE'
        | 'CLASS'
        | 'METHOD'
        | 'PROPERTY'
        | 'FIELD'
        | 'CONSTRUCTOR'
        | 'ENUM'
        | 'INTERFACE'
        | 'FUNCTION'
        | 'VARIABLE'
        | 'CONSTANT'
        | 'STRING'
        | 'NUMBER'
        | 'BOOLEAN'
        | 'ARRAY'
        | 'OBJECT'
        | 'KEY'
        | 'NULL'
        | 'ENUMMEMBER'
        | 'STRUCT'
        | 'EVENT'
        | 'OPERATOR'
        | 'TYPEPARAMETER'

    /**
    description: A location inside a resource (in a repository at a specific commit).
  */
    interface ILocation {
        __typename: 'Location'
        /**
    description: The file that this location refers to.
  */
        resource: TreeEntry
        /**
    description: The range inside the file that this location refers to.
  */
        range: IRange | null
        /**
    description: The URL to this location.
  */
        url: string
    }

    /**
    description: A range inside a file. The start position is inclusive, and the end position is exclusive.
  */
    interface IRange {
        __typename: 'Range'
        /**
    description: The start position of the range (inclusive).
  */
        start: IPosition
        /**
    description: The end position of the range (exclusive).
  */
        end: IPosition
    }

    /**
    description: A zero-based position inside a file.
  */
    interface IPosition {
        __typename: 'Position'
        /**
    description: The line number (zero-based) of the position.
  */
        line: number
        /**
    description: The character offset (zero-based) in the line of the position.
  */
        character: number
    }

    /**
    description: Pagination information. See https://facebook.github.io/relay/graphql/connections.htm#sec-undefined.PageInfo.
  */
    interface IPageInfo {
        __typename: 'PageInfo'
        /**
    description: Whether there is a next page of nodes in the connection.
  */
        hasNextPage: boolean
    }

    interface IFile {
        __typename: 'File'
        /**
    description: The full path (relative to the repository root) of this file.
  */
        path: string
        /**
    description: The base name (i.e., file name only) of this file.
  */
        name: string
        /**
    description: False because this is a file, not a directory.
  */
        isDirectory: boolean
        /**
    description: The repository containing this file.
  */
        repository: IRepository
        /**
    description: The list of Git commits that touched this file.
  */
        commits: Array<IGitCommit>
        /**
    description: The URL to this file.
  */
        url: string
        /**
    description: The content of this file.
  */
        content: string
        /**
    description:  The file rendered as rich HTML, or an empty string if it is not a supported
 rich file type.

 This HTML string is already escaped and thus is always safe to render.
  */
        richHTML: string
        /**
    description: URL specifying where to view the file at an external location.
  */
        externalURL: string | null
        binary: boolean
        highlight: IHighlightedFile
        blame: Array<IHunk>
        dependencyReferences: IDependencyReferences
        blameRaw: string
        /**
    description: Symbols defined in this file.
  */
        symbols: ISymbolConnection
    }

    interface IHighlightedFile {
        __typename: 'HighlightedFile'
        aborted: boolean
        html: string
    }

    interface IHunk {
        __typename: 'Hunk'
        startLine: number
        endLine: number
        startByte: number
        endByte: number
        rev: string
        author: ISignature | null
        message: string
    }

    interface IDependencyReferences {
        __typename: 'DependencyReferences'
        dependencyReferenceData: IDependencyReferencesData
        repoData: IRepoDataMap
    }

    interface IDependencyReferencesData {
        __typename: 'DependencyReferencesData'
        references: Array<IDependencyReference>
        location: IDepLocation
    }

    interface IDependencyReference {
        __typename: 'DependencyReference'
        dependencyData: string
        repoId: number
        hints: string
    }

    interface IDepLocation {
        __typename: 'DepLocation'
        location: string
        symbol: string
    }

    interface IRepoDataMap {
        __typename: 'RepoDataMap'
        repos: Array<IRepository>
        repoIds: Array<number>
    }

    /**
    description: A list of Git commits.
  */
    interface IGitCommitConnection {
        __typename: 'GitCommitConnection'
        /**
    description: A list of Git commits.
  */
        nodes: Array<IGitCommit>
        /**
    description: Pagination information.
  */
        pageInfo: IPageInfo
    }

    /**
    description: A list of packages.
  */
    interface IPackageConnection {
        __typename: 'PackageConnection'
        /**
    description: A list of packages.
  */
        nodes: Array<IPackage>
        /**
    description: The total count of packages in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
        /**
    description: Pagination information.
  */
        pageInfo: IPageInfo
    }

    /**
    description:  A package represents a grouping of code that is returned by a language server in response to a
 workspace/xpackages request.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
    interface IPackage {
        __typename: 'Package'
        /**
    description: The ID of the package.
  */
        id: string
        /**
    description: The repository commit that defines the package.
  */
        definingCommit: IGitCommit
        /**
    description: The programming language used to define the package.
  */
        language: string
        /**
    description:  The package descriptor, as returned by the language server's workspace/xpackages LSP method. The attribute
 names and values are defined by each language server and should generally be considered opaque.

 The ordering is not meaningful.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
        data: Array<IKeyValue>
        /**
    description:  This package's dependencies, as returned by the language server's workspace/xpackages LSP method.

 The ordering is not meaningful.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
        dependencies: Array<IDependency>
        /**
    description:  The list of references (from only this repository at the definingCommit) to definitions in this package.

 If this operation is not supported (by the language server), this field's value will be null.
  */
        internalReferences: IReferenceConnection | null
        /**
    description:  The list of references (from other repositories' packages) to definitions in this package. Currently this
 lists packages that refer to this package, NOT individual call/reference sites within those referencing
 packages (unlike internalReferences, which does list individual call sites). If this operation is not
 supported (by the language server), this field's value will be null.

 EXPERIMENTAL: This field is experimental. It is subject to change. Please report any issues you see, and
 contact support for help.
  */
        externalReferences: IReferenceConnection | null
    }

    /**
    description: A key-value pair.
  */
    interface IKeyValue {
        __typename: 'KeyValue'
        /**
    description: The key.
  */
        key: string
        /**
    description: The value, which can be of any type.
  */
        value: any
    }

    /**
    description:  A dependency represents a dependency relationship between two units of code. It is derived from data returned by
 a language server in response to a workspace/xreferences request.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
    interface IDependency {
        __typename: 'Dependency'
        /**
    description: The ID of the dependency.
  */
        id: string
        /**
    description: The repository commit that depends on the unit of code described by this resolver's other fields.
  */
        dependingCommit: IGitCommit
        /**
    description: The programming language of the dependency.
  */
        language: string
        /**
    description:  The dependency attributes, as returned by the language server's workspace/xdependencies LSP method. The
 attribute names and values are defined by each language server and should generally be considered opaque.
 They generally overlap with the package descriptor's fields in the Package type.

 The ordering is not meaningful.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
        data: Array<IKeyValue>
        /**
    description:  Hints that can be passed to workspace/xreferences to speed up retrieval of references to this dependency.
 These hints are returned by the language server's workspace/xdependencies LSP method. The attribute names and
 values are defined by each language server and should generally be considered opaque.

 The ordering is not meaningful.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
        hints: Array<IKeyValue>
        /**
    description:  The list of references (in the depending commit's code files) to definitions in this dependency.

 If this operation is not supported (by the language server), this field's value will be null.

 EXPERIMENTAL: This field is experimental. It is subject to change. Please report any issues you see, and
 contact support for help.
  */
        references: IReferenceConnection | null
    }

    /**
    description:  A list of code references (e.g., function calls, variable references, package import statements, etc.), as
 returned by language server(s) over LSP.

 NOTE: The actual references (which would be expected to be available in the "nodes" field) are not exposed. This
 is because currently there are no API consumers that need them. In the future, they will be available here, but
 in the meantime, consumers can provide the searchQuery to the Query.search GraphQL resolver to retrieve
 references.
  */
    interface IReferenceConnection {
        __typename: 'ReferenceConnection'
        /**
    description: The total count of references in this connection. If an exact count is not available, then this field's value
will be null; consult the approximateCount field instead.
  */
        totalCount: number | null
        /**
    description: The approximate count of references in this connection. If counting is not supported, then this field's value
will be null.
  */
        approximateCount: IApproximateCount | null
        /**
    description:  The search query (for Sourcegraph search) that matches references in this connection.

 The query string does not include any repo:REPO@REV tokens (even if this connection would seem to warrant
 the inclusion of such tokens). Therefore, clients must add those tokens if they wish to constrain the search
 to only certain repositories and revisions. (This is so that clients can use the nice revision instead of the
 40-character Git commit SHA if desired.)
  */
        queryString: string
        /**
    description:  The symbol descriptor query to pass to language servers in the LSP workspace/xreferences request to retrieve
 all references in this connection. This is derived from the attributes data of this connection's subject
 (e.g., Package.data or Dependency.data). The attribute names and values are defined by each language server
 and should generally be considered opaque.

 The ordering is not meaningful.

 See https://github.com/sourcegraph/language-server-protocol/blob/master/extension-workspace-references.md.
  */
        symbolDescriptor: Array<IKeyValue>
    }

    /**
    description: An approximate count. To display this to the user, use ApproximateCount.label as the number and use
ApproximateCount.count to determine whether to pluralize the noun (if any) adjacent to the label.
  */
    interface IApproximateCount {
        __typename: 'ApproximateCount'
        /**
    description: The count, which may be inexact. This number is always the prefix of the label field.
  */
        count: number
        /**
    description: Whether the count finished and is exact.
  */
        exact: boolean
        /**
    description: A textual label that approximates the count (e.g., "99+" if the counting is cut off at 99).
  */
        label: string
    }

    /**
    description: A list of dependencies.
  */
    interface IDependencyConnection {
        __typename: 'DependencyConnection'
        /**
    description: A list of dependencies.
  */
        nodes: Array<IDependency>
        /**
    description: The total count of dependencies in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
        /**
    description: Pagination information.
  */
        pageInfo: IPageInfo
    }

    /**
    description: Information and status about the mirroring of a repository. In this case, the remote source repository
is external to Sourcegraph and the mirror is maintained by the Sourcegraph site (not the other way
around).
  */
    interface IMirrorRepositoryInfo {
        __typename: 'MirrorRepositoryInfo'
        /**
    description: The URL of the remote source repository.
  */
        remoteURL: string
        /**
    description: Whether the clone of the repository has begun but not yet completed.
  */
        cloneInProgress: boolean
        /**
    description: Whether the repository has ever been successfully cloned.
  */
        cloned: boolean
        /**
    description: When the repository was last successfully updated from the remote source repository..
  */
        updatedAt: string | null
    }

    /**
    description: A repository on an external service (such as GitHub, GitLab, Phabricator, etc.).
  */
    interface IExternalRepository {
        __typename: 'ExternalRepository'
        /**
    description:  The repository's ID on the external service.

 Example: For GitHub, this is the GitHub GraphQL API's node ID for the repository.
  */
        id: string
        /**
    description:  The type of external service where this repository resides.

 Example: "github", "gitlab", etc.
  */
        serviceType: string
        /**
    description:  The particular instance of the external service where this repository resides. Its value is
 opaque but typically consists of the canonical base URL to the service.

 Example: For GitHub.com, this is "https://github.com/".
  */
        serviceID: string
    }

    /**
    description: Information about a repository's text search index.
  */
    interface IRepositoryTextSearchIndex {
        __typename: 'RepositoryTextSearchIndex'
        /**
    description: The indexed repository.
  */
        repository: IRepository
        /**
    description: The status of the text search index, if available.
  */
        status: IRepositoryTextSearchIndexStatus | null
        /**
    description: Git refs in the repository that are configured for text search indexing.
  */
        refs: Array<IRepositoryTextSearchIndexedRef>
    }

    /**
    description: The status of a repository's text search index.
  */
    interface IRepositoryTextSearchIndexStatus {
        __typename: 'RepositoryTextSearchIndexStatus'
        /**
    description: The date that the index was last updated.
  */
        updatedAt: string
        /**
    description: The byte size of the original content.
  */
        contentByteSize: number
        /**
    description: The number of files in the original content.
  */
        contentFilesCount: number
        /**
    description: The byte size of the index.
  */
        indexByteSize: number
        /**
    description: The number of index shards.
  */
        indexShardsCount: number
    }

    /**
    description: A Git ref (usually a branch) in a repository that is configured to be indexed for text search.
  */
    interface IRepositoryTextSearchIndexedRef {
        __typename: 'RepositoryTextSearchIndexedRef'
        /**
    description: The Git ref (usually a branch) that is configured to be indexed for text search. To find the specific commit
SHA that was indexed, use RepositoryTextSearchIndexedRef.indexedCommit; this field's ref target resolves to
the current target, not the target at the time of indexing.
  */
        ref: IGitRef
        /**
    description: Whether a text search index exists for this ref.
  */
        indexed: boolean
        /**
    description: Whether the text search index is of the current commit for the Git ref. If false, the index is stale.
  */
        current: boolean
        /**
    description: The indexed Git commit (which may differ from the ref's current target if the index is out of date). If
indexed is false, this field's value is null.
  */
        indexedCommit: IGitObject | null
    }

    /**
    description: A Git ref.
  */
    interface IGitRef {
        __typename: 'GitRef'
        /**
    description: The globally addressable ID for the Git ref.
  */
        id: string
        /**
    description: The full ref name (e.g., "refs/heads/mybranch" or "refs/tags/mytag").
  */
        name: string
        /**
    description: An unambiguous short name for the ref.
  */
        abbrevName: string
        /**
    description:  The display name of the ref. For branches ("refs/heads/foo"), this is the branch
 name ("foo").

 As a special case, for GitHub pull request refs of the form refs/pull/NUMBER/head,
 this is "#NUMBER".
  */
        displayName: string
        /**
    description: The prefix of the ref, either "", "refs/", "refs/heads/", "refs/pull/", or
"refs/tags/". This prefix is always a prefix of the ref's name.
  */
        prefix: string
        /**
    description: The type of this Git ref.
  */
        type: IGitRefTypeEnum
        /**
    description: The object that the ref points to.
  */
        target: IGitObject
        /**
    description: The associated repository.
  */
        repository: IRepository
    }

    /**
    description: ALl possible types of Git refs.
  */
    type IGitRefTypeEnum = 'GIT_BRANCH' | 'GIT_TAG' | 'GIT_REF_OTHER'

    /**
    description: A Git object.
  */
    interface IGitObject {
        __typename: 'GitObject'
        /**
    description: This object's OID.
  */
        oid: any
        /**
    description: The abbreviated form of this object's OID.
  */
        abbreviatedOID: string
    }

    /**
    description: A list of Git refs.
  */
    interface IGitRefConnection {
        __typename: 'GitRefConnection'
        /**
    description: A list of Git refs.
  */
        nodes: Array<IGitRef>
        /**
    description: The total count of Git refs in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
    }

    interface ITotalRefList {
        __typename: 'TotalRefList'
        repositories: Array<IRepository>
        total: number
    }

    interface IPhabricatorRepo {
        __typename: 'PhabricatorRepo'
        /**
    description: the canonical repo path, like 'github.com/gorilla/mux'
  */
        uri: string
        /**
    description: the unique Phabricator identifier for the repo, like 'MUX'
  */
        callsign: string
        /**
    description: the URL to the phabricator instance, e.g. http://phabricator.sgdev.org
  */
        url: string
    }

    interface IUser {
        __typename: 'User'
        /**
    description: The unique ID for the user.
  */
        id: string
        /**
    description: The user's username.
  */
        username: string
        authID: string
        auth0ID: string
        /**
    description:  The external authentication system's ID for this user, if applicable. For example, if this user is
 authenticated via an SSO provider (using OpenID, SAML, etc.), then this is the ID from that provider.

 Only the user and site admins can access this field.
  */
        externalID: string | null
        /**
    description: The unique numeric ID for the user.
  */
        sourcegraphID: number
        /**
    description:  The user's primary email address.

 Only the user and site admins can access this field.
  */
        email: string
        /**
    description: The display name chosen by the user.
  */
        displayName: string | null
        /**
    description: The URL of the user's avatar image.
  */
        avatarURL: string | null
        /**
    description: The date when the user account was created on Sourcegraph.
  */
        createdAt: string
        /**
    description: The date when the user account was last updated on Sourcegraph.
  */
        updatedAt: string | null
        /**
    description:  Whether the user is a site admin.

 Only the user and site admins can access this field.
  */
        siteAdmin: boolean
        /**
    description:  The latest settings for the user.

 Only the user and site admins can access this field.
  */
        latestSettings: ISettings | null
        /**
    description: The organizations that this user is a member of.
  */
        orgs: Array<IOrg>
        /**
    description: This user's organization memberships.
  */
        orgMemberships: Array<IOrgMembership>
        /**
    description:  The internal tags associated with the user. This is an internal site management feature.

 Only the user and site admins can access this field.
  */
        tags: Array<IUserTag>
        /**
    description:  The user's usage activity on Sourcegraph.

 Only the user and site admins can access this field.
  */
        activity: IUserActivity
        /**
    description:  The user's email addresses.

 Only the user and site admins can access this field.
  */
        emails: Array<IUserEmail>
        /**
    description: Whether the viewer has admin privileges on this user. The user had admin privileges on their own user, and
site admins have admin privileges on all users.
  */
        viewerCanAdminister: boolean
    }

    /**
    description: ConfigurationSubject is something that can have configuration.
  */
    type ConfigurationSubject = IUser | IOrg | ISite

    /**
    description: ConfigurationSubject is something that can have configuration.
  */
    interface IConfigurationSubject {
        __typename: 'ConfigurationSubject'
        id: string
        latestSettings: ISettings | null
    }

    /**
    description: Settings is a version of a configuration settings file.
  */
    interface ISettings {
        __typename: 'Settings'
        id: number
        configuration: IConfiguration
        /**
    description: The subject that these settings are for.
  */
        subject: ConfigurationSubject
        author: IUser
        createdAt: string
        contents: string
    }

    /**
    description: Configuration contains settings from (possibly) multiple settings files.
  */
    interface IConfiguration {
        __typename: 'Configuration'
        /**
    description: The raw JSON contents, encoded as a string.
  */
        contents: string
        /**
    description: Error and warning messages about the configuration.
  */
        messages: Array<string>
    }

    /**
    description: An organization, which is a group of users.
  */
    interface IOrg {
        __typename: 'Org'
        /**
    description: The unique ID for the organization.
  */
        id: string
        /**
    description: The numeric unique ID for the organization.
  */
        orgID: number
        /**
    description: The organization's name. This is unique among all organizations on this Sourcegraph site.
  */
        name: string
        /**
    description: The organization's chosen display name.
  */
        displayName: string | null
        /**
    description: The date when the organization was created, in RFC 3339 format.
  */
        createdAt: string
        /**
    description: A list of users who are members of this organization.
  */
        members: IUserConnection
        /**
    description:  The latest settings for the organization.

 Only organization members and site admins can access this field.
  */
        latestSettings: ISettings | null
        /**
    description:  The repositories associated with the organization. This is an experimental feature.

 Only organization members and site admins can access this field.
  */
        repos: Array<IOrgRepo>
        /**
    description:  Look up a repository associated with the organization. This is an experimental feature.

 Only organization members and site admins can access this field.
  */
        repo: IOrgRepo | null
        /**
    description:  Threads associated with the organization. This is an experimental feature.

 Only organization members and site admins can access this field.
  */
        threads: IThreadConnection
        /**
    description:  The internal tags associated with the organization. This is an internal site management feature.

 Only organization members and site admins can access this field.
  */
        tags: Array<IOrgTag>
        /**
    description: Whether the viewer has admin privileges on this organization. Currently, all of an organization's members
have admin privileges on the organization.
  */
        viewerCanAdminister: boolean
    }

    /**
    description: A list of users.
  */
    interface IUserConnection {
        __typename: 'UserConnection'
        /**
    description: A list of users.
  */
        nodes: Array<IUser>
        /**
    description: The total count of users in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
    }

    interface IOrgRepo {
        __typename: 'OrgRepo'
        id: number
        org: IOrg
        canonicalRemoteID: string
        createdAt: string
        updatedAt: string
        threads: IThreadConnection
        /**
    description: The repository that this refers to, if the repository is available on the server. This is null
for repositories that only exist for users locally (that they use with the editor) but that
are not on the server.
  */
        repository: IRepository | null
    }

    /**
    description: A list of threads.
  */
    interface IThreadConnection {
        __typename: 'ThreadConnection'
        /**
    description: A list of threads.
  */
        nodes: Array<IThread>
        /**
    description: The total count of threads in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
    }

    /**
    description: Thread is a comment thread.
  */
    interface IThread {
        __typename: 'Thread'
        /**
    description: The unique ID.
  */
        id: string
        /**
    description: The primary key from the database.
  */
        databaseID: number
        repo: IOrgRepo
        file: string
        /**
    description: The relative path of the resource in the repository at repoRevision.
  */
        repoRevisionPath: string
        /**
    description: The relative path of the resource in the repository at linesRevision.
  */
        linesRevisionPath: string
        branch: string | null
        /**
    description: The commit ID of the repository at the time the thread was created.
  */
        repoRevision: string
        /**
    description:  The commit ID from Git blame, at the time the thread was created.

 The selection may be multiple lines, and the commit id is the
 topologically most recent commit of the blame commit ids for the selected
 lines.

 For example, if you have a selection of lines that have blame revisions
 (a, c, e, f), and assuming a history like::

 	a <- b <- c <- d <- e <- f <- g <- h <- HEAD

 Then lines_revision would be f, because all other blame revisions a, c, e
 are reachable from f.

 Or in lay terms: "What is the oldest revision that I could checkout and
 still see the exact lines of code that I selected?".
  */
        linesRevision: string
        title: string
        startLine: number
        endLine: number
        startCharacter: number
        endCharacter: number
        rangeLength: number
        createdAt: string
        archivedAt: string | null
        author: IUser
        lines: IThreadLines | null
        comments: Array<IComment>
    }

    interface IThreadLines {
        __typename: 'ThreadLines'
        /**
    description:  HTML context lines before 'html'.

 It is sanitized already by the server, and thus is safe for rendering.
  */
        htmlBefore: string
        /**
    description:  HTML lines that the user's selection was made on.

 It is sanitized already by the server, and thus is safe for rendering.
  */
        html: string
        /**
    description:  HTML context lines after 'html'.

 It is sanitized already by the server, and thus is safe for rendering.
  */
        htmlAfter: string
        /**
    description: text context lines before 'text'.
  */
        textBefore: string
        /**
    description: text lines that the user's selection was made on.
  */
        text: string
        /**
    description: text context lines after 'text'.
  */
        textAfter: string
        /**
    description:  byte offset into textLines where user selection began

 In Go syntax, userSelection := text[rangeStart:rangeStart+rangeLength]
  */
        textSelectionRangeStart: number
        /**
    description:  length in bytes of the user selection

 In Go syntax, userSelection := text[rangeStart:rangeStart+rangeLength]
  */
        textSelectionRangeLength: number
    }

    /**
    description: Comment is a comment in a thread.
  */
    interface IComment {
        __typename: 'Comment'
        /**
    description: The unique ID.
  */
        id: string
        /**
    description: The primary key from the database.
  */
        databaseID: number
        title: string
        contents: string
        /**
    description:  The file rendered as rich HTML, or an empty string if it is not a supported
 rich file type.

 This HTML string is already escaped and thus is always safe to render.
  */
        richHTML: string
        createdAt: string
        updatedAt: string
        author: IUser
    }

    interface IOrgTag {
        __typename: 'OrgTag'
        id: number
        name: string
    }

    interface IOrgMembership {
        __typename: 'OrgMembership'
        id: number
        org: IOrg
        user: IUser
        createdAt: string
        updatedAt: string
    }

    interface IUserTag {
        __typename: 'UserTag'
        id: number
        name: string
    }

    /**
    description: UserActivity describes a user's activity on the site.
  */
    interface IUserActivity {
        __typename: 'UserActivity'
        /**
    description: The number of search queries that the user has performed.
  */
        searchQueries: number
        /**
    description: The number of page views that the user has performed.
  */
        pageViews: number
        /**
    description: The last time the user viewed a page.
  */
        lastPageViewTime: string
    }

    /**
    description: A user's email address.
  */
    interface IUserEmail {
        __typename: 'UserEmail'
        /**
    description: The email address.
  */
        email: string
        /**
    description: Whether the email address has been verified by the user.
  */
        verified: boolean
        /**
    description: Whether the email address is pending verification.
  */
        verificationPending: boolean
        /**
    description: The user associated with this email address.
  */
        user: IUser
        /**
    description: Whether the viewer has privileges to manually mark this email address as verified (without the user going
through the normal verification process). Only site admins have this privilege.
  */
        viewerCanManuallyVerify: boolean
    }

    /**
    description: The configurations for all of the relevant configuration subjects, plus the merged
configuration.
  */
    interface IConfigurationCascade {
        __typename: 'ConfigurationCascade'
        /**
    description: The default settings, which are applied first and the lowest priority behind
all configuration subjects' settings.
  */
        defaults: IConfiguration | null
        /**
    description: The configurations for all of the subjects that are applied for the currently
authenticated user. For example, a user in 2 orgs would have the following
configuration subjects: org 1, org 2, and the user.
  */
        subjects: Array<ConfigurationSubject>
        /**
    description: The effective configuration, merged from all of the subjects.
  */
        merged: IConfiguration
    }

    interface ISearch {
        __typename: 'Search'
        results: ISearchResults
        suggestions: Array<SearchSuggestion>
        /**
    description: A subset of results (excluding actual search results) which are heavily
cached and thus quicker to query. Useful for e.g. querying sparkline
data.
  */
        stats: ISearchResultsStats
    }

    interface ISearchResults {
        __typename: 'SearchResults'
        results: Array<SearchResult>
        resultCount: number
        approximateResultCount: string
        limitHit: boolean
        /**
    description: Integers representing the sparkline for the search results.
  */
        sparkline: Array<number>
        /**
    description: Repositories that were eligible to be searched.
  */
        repositories: Array<string>
        /**
    description: Repositories that were actually searched. Excludes repositories that would have been searched but were not
because a timeout or error occurred while performing the search, or because the result limit was already
reached.
  */
        repositoriesSearched: Array<string>
        /**
    description: Indexed repositories searched. This is a subset of repositoriesSearched.
  */
        indexedRepositoriesSearched: Array<string>
        /**
    description: Repositories that are busy cloning onto gitserver.
  */
        cloning: Array<string>
        /**
    description: Repositories or commits that do not exist.
  */
        missing: Array<string>
        /**
    description: Repositories or commits which we did not manage to search in time. Trying
again usually will work.
  */
        timedout: Array<string>
        /**
    description: An alert message that should be displayed before any results.
  */
        alert: ISearchAlert | null
        /**
    description: The time it took to generate these results.
  */
        elapsedMilliseconds: number
        /**
    description: Dynamic filters generated by the search results
  */
        dynamicFilters: Array<ISearchFilter>
    }

    type SearchResult = IFileMatch | ICommitSearchResult | IRepository

    interface IFileMatch {
        __typename: 'FileMatch'
        resource: string
        /**
    description: The symbols found in this file that match the query
  */
        symbols: Array<ISymbol>
        lineMatches: Array<ILineMatch>
        limitHit: boolean
    }

    interface ILineMatch {
        __typename: 'LineMatch'
        preview: string
        lineNumber: number
        /**
    description: Tuples of [offset, length] measured in characters (not bytes)
  */
        offsetAndLengths: Array<Array<number>>
        limitHit: boolean
    }

    /**
    description: A search result that is a Git commit.
  */
    interface ICommitSearchResult {
        __typename: 'CommitSearchResult'
        /**
    description: The commit that matched the search query.
  */
        commit: IGitCommit
        /**
    description: The ref names of the commit.
  */
        refs: Array<IGitRef>
        /**
    description: The refs by which this commit was reached.
  */
        sourceRefs: Array<IGitRef>
        /**
    description: The matching portion of the commit message, if any.
  */
        messagePreview: IHighlightedString | null
        /**
    description: The matching portion of the diff, if any.
  */
        diffPreview: IHighlightedString | null
    }

    /**
    description: A string that has highlights (e.g, query matches).
  */
    interface IHighlightedString {
        __typename: 'HighlightedString'
        /**
    description: The full contents of the string.
  */
        value: string
        /**
    description: Highlighted matches of the query in the preview string.
  */
        highlights: Array<IHighlight>
    }

    /**
    description: A highlighted region in a string (e.g., matched by a query).
  */
    interface IHighlight {
        __typename: 'Highlight'
        /**
    description: The 1-indexed line number.
  */
        line: number
        /**
    description: The 1-indexed character on the line.
  */
        character: number
        /**
    description: The length of the highlight, in characters (on the same line).
  */
        length: number
    }

    /**
    description: A search-related alert message.
  */
    interface ISearchAlert {
        __typename: 'SearchAlert'
        title: string
        description: string | null
        /**
    description: "Did you mean: ____" query proposals
  */
        proposedQueries: Array<ISearchQueryDescription>
    }

    interface ISearchQueryDescription {
        __typename: 'SearchQueryDescription'
        description: string | null
        query: ISearchQuery
    }

    interface ISearchQuery {
        __typename: 'SearchQuery'
        query: string
    }

    interface ISearchFilter {
        __typename: 'SearchFilter'
        value: string
    }

    type SearchSuggestion = IRepository | IFile | ISymbol

    interface ISearchResultsStats {
        __typename: 'SearchResultsStats'
        approximateResultCount: string
        sparkline: Array<number>
    }

    interface ISearchScope {
        __typename: 'SearchScope'
        /**
    description: A unique identifier for the search scope.
If set, a scoped search page is available at https://[sourcegraph-hostname]/search/scope/ID, where ID is this value.
  */
        id: string | null
        name: string
        value: string
        /**
    description: A description for this search scope, which will appear on the scoped search page.
  */
        description: string | null
    }

    /**
    description: A saved search query, defined in configuration.
  */
    interface ISavedQuery {
        __typename: 'SavedQuery'
        /**
    description: The unique ID of the saved query.
  */
        id: string
        /**
    description: The subject whose configuration this saved query was defined in.
  */
        subject: ConfigurationSubject
        /**
    description: The unique key of this saved query (unique only among all other saved
queries of the same subject).
  */
        key: string | null
        /**
    description: The 0-indexed index of this saved query in the subject's configuration.
  */
        index: number
        description: string
        query: ISearchQuery
        showOnHomepage: boolean
        notify: boolean
        notifySlack: boolean
    }

    /**
    description: A group of repositories.
  */
    interface IRepoGroup {
        __typename: 'RepoGroup'
        name: string
        repositories: Array<string>
    }

    /**
    description:  Represents a shared item (either a shared code comment OR code snippet).

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItem {
        __typename: 'SharedItem'
        /**
    description: who shared the item.
  */
        author: ISharedItemUser
        public: boolean
        thread: ISharedItemThread
        /**
    description: present only if the shared item was a specific comment.
  */
        comment: ISharedItemComment | null
    }

    /**
    description:  Like the User type, except with fields that should not be accessible with a
 secret URL removed.

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItemUser {
        __typename: 'SharedItemUser'
        displayName: string | null
        username: string
        avatarURL: string | null
    }

    /**
    description:  Like the Thread type, except with fields that should not be accessible with a
 secret URL removed.

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItemThread {
        __typename: 'SharedItemThread'
        id: string
        databaseID: number
        repo: ISharedItemOrgRepo
        file: string
        branch: string | null
        repoRevision: string
        linesRevision: string
        title: string
        startLine: number
        endLine: number
        startCharacter: number
        endCharacter: number
        rangeLength: number
        createdAt: string
        archivedAt: string | null
        author: ISharedItemUser
        lines: ISharedItemThreadLines | null
        comments: Array<ISharedItemComment>
    }

    /**
    description:  Like the OrgRepo type, except with fields that should not be accessible with
 a secret URL removed.

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItemOrgRepo {
        __typename: 'SharedItemOrgRepo'
        id: number
        remoteUri: string
        /**
    description: See OrgRepo.repository.
  */
        repository: IRepository | null
    }

    /**
    description:  Exactly the same as the ThreadLines type, except it cannot have sensitive
 fields accidently added.

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItemThreadLines {
        __typename: 'SharedItemThreadLines'
        htmlBefore: string
        html: string
        htmlAfter: string
        textBefore: string
        text: string
        textAfter: string
        textSelectionRangeStart: number
        textSelectionRangeLength: number
    }

    /**
    description:  Like the Comment type, except with fields that should not be accessible with a
 secret URL removed.

 🚨 SECURITY: Every field here is accessible publicly given a shared item URL.
 Do NOT use any non-primitive graphql type here unless it is also a SharedItem
 type.
  */
    interface ISharedItemComment {
        __typename: 'SharedItemComment'
        id: string
        databaseID: number
        title: string
        contents: string
        richHTML: string
        createdAt: string
        updatedAt: string
        author: ISharedItemUser
    }

    /**
    description:  A site is an installation of Sourcegraph that consists of one or more
 servers that share the same configuration and database.

 The site is a singleton; the API only ever returns the single global site.
  */
    interface ISite {
        __typename: 'Site'
        /**
    description: The site's opaque GraphQL ID. This is NOT the "site ID" as it is referred to elsewhere;
use the siteID field for that. (GraphQL node types conventionally have an id field of type
ID! that globally identifies the node.)
  */
        id: string
        /**
    description: The site ID.
  */
        siteID: string
        /**
    description: The site's configuration. Only visible to site admins.
  */
        configuration: ISiteConfiguration
        /**
    description: The site's latest site-wide settings (which are the lowest-precedence
in the configuration cascade for a user).
  */
        latestSettings: ISettings | null
        /**
    description: Whether the viewer can reload the site (with the reloadSite mutation).
  */
        canReloadSite: boolean
        /**
    description: List all repositories.
  */
        repositories: IRepositoryConnection
        /**
    description: List all users.
  */
        users: IUserConnection
        /**
    description: List all organizations.
  */
        orgs: IOrgConnection
        /**
    description: List all threads.
  */
        threads: IThreadConnection
        /**
    description: The build version of the Sourcegraph Server software that is running on this site (of the form
NNNNN_YYYY-MM-DD_XXXXX, like 12345_2018-01-01_abcdef).
  */
        buildVersion: string
        /**
    description: The product version of the Sourcegraph Server software that is running on this site (in semver
form, like 1.2.3).
  */
        productVersion: string
        /**
    description: Information about software updates for version of Sourcegraph Server that
this site is running.
  */
        updateCheck: IUpdateCheck
        /**
    description: Samples of recent telemetry payloads, visible to the site administrator only.
  */
        telemetrySamples: Array<string>
        /**
    description: Whether the site needs to be configured to add repositories.
  */
        needsRepositoryConfiguration: boolean
        /**
    description: Whether the site has zero access-enabled repositories.
  */
        noRepositoriesEnabled: boolean
        /**
    description: Whether the site has code intelligence. This field will be expanded in the future to describe
more about the code intelligence available (languages supported, etc.). It is subject to
change without notice.
  */
        hasCodeIntelligence: boolean
        /**
    description: Whether the site is using an external authentication service such as oidc or saml.
  */
        externalAuthEnabled: boolean
        /**
    description: Whether we want to show built-in searches on the saved searches page
  */
        disableBuiltInSearches: boolean
    }

    /**
    description: The configuration for a site.
  */
    interface ISiteConfiguration {
        __typename: 'SiteConfiguration'
        /**
    description: The effective configuration JSON. This will lag behind the pendingContents
if the site configuration was updated but the server has not yet restarted.
  */
        effectiveContents: string
        /**
    description: The pending configuration JSON, which will become effective after the next
server restart. This is set if the site configuration has been updated since
the server started.
  */
        pendingContents: string | null
        /**
    description: Validation errors on the configuration JSON (pendingContents if it exists, otherwise
effectiveContents). These are different from the JSON Schema validation errors;
they are errors from validations that can't be expressed in the JSON Schema.
  */
        extraValidationErrors: Array<string>
        /**
    description: Whether the viewer can update the site configuration (using the
updateSiteConfiguration mutation).
  */
        canUpdate: boolean
        /**
    description: The source of the configuration as a human-readable description,
referring to either the on-disk file path or the SOURCEGRAPH_CONFIG
env var.
  */
        source: string
    }

    /**
    description: A list of repositories.
  */
    interface IRepositoryConnection {
        __typename: 'RepositoryConnection'
        /**
    description: A list of repositories.
  */
        nodes: Array<IRepository>
        /**
    description:  The total count of repositories in the connection. This total count may be larger
 than the number of nodes in this object when the result is paginated.

 In some cases, the total count can't be computed quickly; if so, it is null. Pass
 precise: true to always compute total counts even if it takes a while.
  */
        totalCount: number | null
        /**
    description: Pagination information.
  */
        pageInfo: IPageInfo
    }

    /**
    description: A list of organizations.
  */
    interface IOrgConnection {
        __typename: 'OrgConnection'
        /**
    description: A list of organizations.
  */
        nodes: Array<IOrg>
        /**
    description: The total count of organizations in the connection. This total count may be larger
than the number of nodes in this object when the result is paginated.
  */
        totalCount: number
    }

    /**
    description: Information about software updates for Sourcegraph Server.
  */
    interface IUpdateCheck {
        __typename: 'UpdateCheck'
        /**
    description: Whether an update check is currently in progress.
  */
        pending: boolean
        /**
    description: When the last update check was completed, or null if no update check has
been completed (or performed) yet.
  */
        checkedAt: string | null
        /**
    description: If an error occurred during the last update check, this message describes
the error.
  */
        errorMessage: string | null
        /**
    description: If an update is available, the version string of the updated version.
  */
        updateVersionAvailable: string | null
    }

    interface IMutation {
        __typename: 'Mutation'
        createThread: IThread
        createThread2: IThread
        updateUser: IUser
        /**
    description: Update the settings for the currently authenticated user.
  */
        updateUserSettings: ISettings
        /**
    description: Update the global settings for all users.
  */
        updateSiteSettings: ISettings
        updateThread: IThread
        addCommentToThread: IThread
        /**
    description:  This method is the same as addCommentToThread, the only difference is
 that authentication is based on the secret ULID instead of the current
 user.

 🚨 SECURITY: Every field of the return type here is accessible publicly
 given a shared item URL.
  */
        addCommentToThreadShared: ISharedItemThread
        shareThread: string
        shareComment: string
        createOrg: IOrg
        updateOrg: IOrg
        updateOrgSettings: ISettings
        /**
    description: Deletes an organization. Only site admins may perform this mutation.
  */
        deleteOrganization: IEmptyResponse | null
        /**
    description:  Adds a repository on a code host that is already present in the site configuration. The name (which may
 consist of one or more path components) of the repository must be recognized by an already configured code
 host, or else Sourcegraph won't know how to clone it.

 The newly added repository is not enabled (unless the code host's configuration specifies that it should be
 enabled). The caller must explicitly enable it with setRepositoryEnabled.

 If the repository already exists, it is returned.

 To add arbitrary repositories (that don't need to reside on an already configured code host), use the site
 configuration "repos.list" property.

 As a special case, GitHub.com public repositories may be added by using a name of the form
 "github.com/owner/repo". If there is no GitHub personal access token for github.com configured, the site may
 experience problems with github.com repositories due to the low default github.com API rate limit (60
 requests per hour).

 Only site admins may perform this mutation.
  */
        addRepository: IRepository
        /**
    description:  Enables or disables a repository. A disabled repository is only
 accessible to site admins and never appears in search results.

 Only site admins may perform this mutation.
  */
        setRepositoryEnabled: IEmptyResponse | null
        /**
    description:  Enables or disables all site repositories.

 Only site admins may perform this mutation.
  */
        setAllRepositoriesEnabled: IEmptyResponse | null
        /**
    description:  Tests the connection to a mirror repository's original source repository. This is an
 expensive and slow operation, so it should only be used for interactive diagnostics.

 Only site admins may perform this mutation.
  */
        checkMirrorRepositoryConnection: ICheckMirrorRepositoryConnectionResult
        /**
    description:  Schedule the mirror repository to be updated from its original source repository. Updating
 occurs automatically, so this should not normally be needed.

 Only site admins may perform this mutation.
  */
        updateMirrorRepository: IEmptyResponse
        /**
    description:  Schedules all repositories to be updated from their original source repositories. Updating
 occurs automatically, so this should not normally be needed.

 Only site admins may perform this mutation.
  */
        updateAllMirrorRepositories: IEmptyResponse
        /**
    description:  Deletes a repository and all data associated with it, irreversibly.

 If the repository was added because it was present in the site configuration (directly,
 or because it originated from a configured code host), then it will be re-added during
 the next sync. If you intend to make the repository inaccessible to users and not searchable,
 use setRepositoryEnabled to disable the repository instead of deleteRepository.

 Only site admins may perform this mutation.
  */
        deleteRepository: IEmptyResponse | null
        /**
    description: Creates a user account for a new user and generates a reset password link that the user
must visit to sign into the account. Only site admins may perform this mutation.
  */
        createUserBySiteAdmin: ICreateUserBySiteAdminResult
        /**
    description: Randomize a user's password so that they need to reset it before they can sign in again.
Only site admins may perform this mutation.
  */
        randomizeUserPasswordBySiteAdmin: IRandomizeUserPasswordBySiteAdminResult
        /**
    description:  Adds an email address to the user's account. The email address will be marked as unverified until the user
 has followed the email verification process.

 Only the user and site admins may perform this mutation.
  */
        addUserEmail: IEmptyResponse
        /**
    description:  Removes an email address from the user's account.

 Only the user and site admins may perform this mutation.
  */
        removeUserEmail: IEmptyResponse
        /**
    description:  Manually set the verification status of a user's email, without going through the normal verification process
 (of clicking on a link in the email with a verification code).

 Only site admins may perform this mutation.
  */
        setUserEmailVerified: IEmptyResponse
        /**
    description: Deletes a user account. Only site admins may perform this mutation.
  */
        deleteUser: IEmptyResponse | null
        inviteUser: IInviteUserResult | null
        /**
    description: Updates the current user's password. The oldPassword arg must match the user's current password.
  */
        updatePassword: IEmptyResponse | null
        acceptUserInvite: IEmptyResponse | null
        removeUserFromOrg: IEmptyResponse | null
        /**
    description: adds a phabricator repository to the Sourcegraph server.
example callsign: "MUX"
example uri: "github.com/gorilla/mux"
  */
        addPhabricatorRepo: IEmptyResponse | null
        logUserEvent: IEmptyResponse | null
        /**
    description:  Sends a test notification for the saved search. Be careful: this will send a notifcation (email and other
 types of notifications, if configured) to all subscribers of the saved search, which could be bothersome.

 Only subscribers to this saved search may perform this action.
  */
        sendSavedSearchTestNotification: IEmptyResponse | null
        /**
    description: All mutations that update configuration settings are under this field.
  */
        configurationMutation: IConfigurationMutation | null
        /**
    description: Updates the site configuration. Returns whether or not a restart is
needed for the update to be applied
  */
        updateSiteConfiguration: boolean
        /**
    description:  Sets whether the user with the specified user ID is a site admin.

 🚨 SECURITY: Only trusted users should be given site admin permissions.
 Site admins have full access to the server's site configuration and other
 sensitive data, and they can perform destructive actions such as
 restarting the site.
  */
        setUserIsSiteAdmin: IEmptyResponse | null
        /**
    description: Reloads the site by restarting the server. This is not supported for all deployment
types. This may cause downtime.
  */
        reloadSite: IEmptyResponse | null
    }

    interface ICreateThreadInput {
        orgID: string
        canonicalRemoteID: string
        cloneURL: string
        repoRevisionPath: string
        linesRevisionPath: string
        repoRevision: string
        linesRevision: string
        branch?: string | null
        startLine: number
        endLine: number
        startCharacter: number
        endCharacter: number
        rangeLength: number
        contents: string
        lines?: IThreadLinesInput | null
    }

    /**
    description: Literally the exact same thing as above, except it's an input type because
GraphQL doesn't allow mixing input and output types.
  */
    interface IThreadLinesInput {
        /**
    description: HTML context lines before 'html'.
  */
        htmlBefore: string
        /**
    description: HTML lines that the user's selection was made on.
  */
        html: string
        /**
    description: HTML context lines after 'html'.
  */
        htmlAfter: string
        /**
    description: text context lines before 'text'.
  */
        textBefore: string
        /**
    description: text lines that the user's selection was made on.
  */
        text: string
        /**
    description: text context lines after 'text'.
  */
        textAfter: string
        /**
    description:  byte offset into textLines where user selection began

 In Go syntax, userSelection := text[rangeStart:rangeStart+rangeLength]
  */
        textSelectionRangeStart: number
        /**
    description:  length in bytes of the user selection

 In Go syntax, userSelection := text[rangeStart:rangeStart+rangeLength]
  */
        textSelectionRangeLength: number
    }

    interface IEmptyResponse {
        __typename: 'EmptyResponse'
        alwaysNil: string | null
    }

    /**
    description: The result for Mutation.checkMirrorRepositoryConnection.
  */
    interface ICheckMirrorRepositoryConnectionResult {
        __typename: 'CheckMirrorRepositoryConnectionResult'
        /**
    description: The error message encountered during the update operation, if any. If null, then
the connection check succeeded.
  */
        error: string | null
    }

    /**
    description: The result for Mutation.createUserBySiteAdmin.
  */
    interface ICreateUserBySiteAdminResult {
        __typename: 'CreateUserBySiteAdminResult'
        /**
    description: The reset password URL that the new user must visit to sign into their account.
  */
        resetPasswordURL: string
    }

    /**
    description: The result for Mutation.randomizeUserPasswordBySiteAdmin.
  */
    interface IRandomizeUserPasswordBySiteAdminResult {
        __typename: 'RandomizeUserPasswordBySiteAdminResult'
        /**
    description: The reset password URL that the user must visit to sign into their account again.
  */
        resetPasswordURL: string
    }

    interface IInviteUserResult {
        __typename: 'InviteUserResult'
        /**
    description: The URL that the invited user can visit to accept the invitation.
  */
        acceptInviteURL: string
    }

    type IUserEventEnum = 'PAGEVIEW' | 'SEARCHQUERY'

    /**
    description: Input for Mutation.configuration, which contains fields that all configuration
mutations need.
  */
    interface IConfigurationMutationGroupInput {
        /**
    description: The subject whose configuration to mutate (org, user, etc.).
  */
        subject: string
        /**
    description: The ID of the last-known configuration known to the client, or null if
there is none. This field is used to prevent race conditions when there
are concurrent editors.
  */
        lastID?: number | null
    }

    /**
    description:  Mutations that update configuration settings. These mutations are grouped
 together because they:

 - are all versioned to avoid race conditions with concurrent editors
 - all apply to a specific configuration subject

 Grouping them lets us extract those common parameters to the
 Mutation.configuration field.
  */
    interface IConfigurationMutation {
        __typename: 'ConfigurationMutation'
        /**
    description: Perform a raw configuration update. Use one of the other fields on this
type instead if possible.
  */
        updateConfiguration: IUpdateConfigurationPayload | null
        /**
    description: Create a saved query.
  */
        createSavedQuery: ISavedQuery
        /**
    description: Update the saved query with the given ID in the configuration.
  */
        updateSavedQuery: ISavedQuery
        /**
    description: Delete the saved query with the given ID in the configuration.
  */
        deleteSavedQuery: IEmptyResponse | null
    }

    /**
    description: Input to ConfigurationMutation.updateConfiguration. If multiple fields are specified,
then their respective operations are performed sequentially in the order in which the
fields appear in this type.
  */
    interface IUpdateConfigurationInput {
        /**
    description:  The name of the property to update.

 Inserting into an existing array is not yet supported.
  */
        property: string
        /**
    description: The new JSON-encoded value to insert. If the field's value is null, the property is
removed. (This is different from the field's value being the string "null".)
  */
        value?: any | null
    }

    /**
    description: The payload for ConfigurationMutation.updateConfiguration.
  */
    interface IUpdateConfigurationPayload {
        __typename: 'UpdateConfigurationPayload'
        empty: IEmptyResponse | null
    }

    /**
    description: A diff between two diffable Git objects.
  */
    interface IDiff {
        __typename: 'Diff'
        /**
    description: The diff's repository.
  */
        repository: IRepository
        /**
    description: The revision range of the diff.
  */
        range: IGitRevisionRange
    }

    /**
    description: A Git revision range of the form "base..head" or "base...head". Other revision
range formats are not supported.
  */
    interface IGitRevisionRange {
        __typename: 'GitRevisionRange'
        /**
    description: The Git revision range expression of the form "base..head" or "base...head".
  */
        expr: string
        /**
    description: The base (left-hand side) of the range.
  */
        base: GitRevSpec
        /**
    description: The base's revspec as an expression.
  */
        baseRevSpec: IGitRevSpecExpr
        /**
    description: The head (right-hand side) of the range.
  */
        head: GitRevSpec
        /**
    description: The head's revspec as an expression.
  */
        headRevSpec: IGitRevSpecExpr
        /**
    description: The merge-base of the base and head revisions, if this is a "base...head"
revision range. If this is a "base..head" revision range, then this field is null.
  */
        mergeBase: IGitObject | null
    }

    /**
    description: A Git revspec.
  */
    type GitRevSpec = IGitRef | IGitRevSpecExpr | IGitObject

    /**
    description: A Git revspec expression that (possibly) evaluates to a Git revision.
  */
    interface IGitRevSpecExpr {
        __typename: 'GitRevSpecExpr'
        expr: string
    }

    /**
    description: A search result that is a diff between two diffable Git objects.
  */
    interface IDiffSearchResult {
        __typename: 'DiffSearchResult'
        /**
    description: The diff that matched the search query.
  */
        diff: IDiff
        /**
    description: The matching portion of the diff.
  */
        preview: IHighlightedString
    }

    interface IRefFields {
        __typename: 'RefFields'
        refLocation: IRefLocation | null
        uri: IURI | null
    }

    interface IRefLocation {
        __typename: 'RefLocation'
        startLineNumber: number
        startColumn: number
        endLineNumber: number
        endColumn: number
    }

    interface IURI {
        __typename: 'URI'
        host: string
        fragment: string
        path: string
        query: string
        scheme: string
    }

    interface IDeploymentConfiguration {
        __typename: 'DeploymentConfiguration'
        email: string | null
        siteID: string | null
    }
}

// tslint:enable
