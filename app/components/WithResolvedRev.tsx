import * as React from 'react'
import { defer, Subject, Subscription } from 'rxjs'
import { catchError, delay, retryWhen, switchMap, tap } from 'rxjs/operators'
import { setServerUrls } from '../../app/util/context'
import storage from '../../extension/storage'
import { ECLONEINPROGESS, EREPONOTFOUND } from '../backend/errors'
import { resolveRev } from '../repo/backend'

interface WithResolvedRevProps {
    component: any
    cloningComponent?: any
    notFoundComponent?: any // for 404s
    repoPath: string
    rev?: string
    [key: string]: any
}

interface WithResolvedRevState {
    commitID?: string
    cloneInProgress: boolean
    notFound: boolean
}

export class WithResolvedRev extends React.Component<WithResolvedRevProps, WithResolvedRevState> {
    public state: WithResolvedRevState = { cloneInProgress: false, notFound: false }
    private componentUpdates = new Subject<WithResolvedRevProps>()
    private subscriptions = new Subscription()

    constructor(props: WithResolvedRevProps) {
        super(props)
        this.subscriptions.add(
            this.componentUpdates
                .pipe(
                    switchMap(({ repoPath, rev }) => {
                        if (!repoPath) {
                            return [undefined]
                        }
                        // Defer Observable so it retries the request on resubscription
                        return (
                            defer(() => resolveRev({ repoPath, rev }))
                                // On a CloneInProgress error, retry after 5s
                                .pipe(
                                    retryWhen(errors =>
                                        errors.pipe(
                                            tap(err => {
                                                if (err.code === ECLONEINPROGESS) {
                                                    // Display cloning screen to the user and retry
                                                    this.setState({ cloneInProgress: true })
                                                    return
                                                }
                                                if (err.code === EREPONOTFOUND) {
                                                    // Display 404to the user and do not retry
                                                    this.setState({ notFound: true })
                                                }
                                                // Don't retry other errors
                                                throw err
                                            }),
                                            delay(1000)
                                        )
                                    ),
                                    // Don't break the stream
                                    catchError(err => [])
                                )
                        )
                    })
                )
                .subscribe(
                    commitID => {
                        this.setState({ commitID, cloneInProgress: false })
                    },
                    err => console.error(err)
                )
        )
    }

    public componentDidMount(): void {
        this.componentUpdates.next(this.props)
        storage.onChanged(items => {
            if (items.serverUrls && items.serverUrls.newValue) {
                setServerUrls(items.serverUrls.newValue)
                this.componentUpdates.next(this.props)
            }
        })
    }

    public componentWillReceiveProps(nextProps: WithResolvedRevProps): void {
        if (this.props.repoPath !== nextProps.repoPath || this.props.rev !== nextProps.rev) {
            // clear state so the child won't render until the revision is resolved for new props
            this.state = { cloneInProgress: false, notFound: false }
            this.componentUpdates.next(nextProps)
        }
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        if (this.props.notFoundComponent && this.state.notFound) {
            return <this.props.notFoundComponent {...this.props} />
        }
        if (this.props.cloningComponent && this.state.cloneInProgress) {
            return <this.props.cloningComponent {...this.props} />
        }
        if (this.props.repoPath && !this.state.commitID) {
            // commit not yet resolved but required if repoPath prop is provided;
            // render empty until commit resolved
            return null
        }
        return <this.props.component {...this.props} commitID={this.state.commitID} />
    }
}
