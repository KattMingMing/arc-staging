import * as React from 'react'
import { OpenOnSourcegraph } from '../components/OpenOnSourcegraph'
import { GitHubBlobUrl, GitHubMode, GitHubPullUrl, GitHubRepositoryUrl } from '../github/index'
import * as github from '../github/util'
import { OpenInSourcegraphProps } from '../repo/index'
import { eventLogger } from '../util/context'

export class ContextualSourcegraphButton extends React.Component<{}, {}> {
    public render(): JSX.Element | null {
        const gitHubState = github.getGitHubState(window.location.href)
        if (!gitHubState) {
            return null
        }

        const { label, openProps, ariaLabel } = this.openOnSourcegraphProps(gitHubState)
        const className = ariaLabel ? 'btn btn-sm tooltipped tooltipped-s' : 'btn btn-sm'
        return <OpenOnSourcegraph openProps={openProps} ariaLabel={ariaLabel} label={label} className={className} onClick={this.onClick} />
    }

    private onClick = () => {
        const gitHubState = github.getGitHubState(window.location.href)
        if (!gitHubState) {
            return
        }
        const mode = gitHubState.mode

        const { repoPath, rev } = github.parseURL()
        const props = { repo: repoPath, mode: rev }

        switch (mode) {
            case GitHubMode.Repository:
                eventLogger.logViewRepositoryClicked(props)
                break
            case GitHubMode.PullRequest:
                eventLogger.logViewPullRequestClicked(props)
                break
            default:
                eventLogger.logOpenOnSourcegraphButtonClicked(props)
                break
        }
    }

    private openOnSourcegraphProps(state: GitHubBlobUrl | GitHubPullUrl | GitHubRepositoryUrl): { label: string, openProps: OpenInSourcegraphProps, ariaLabel?: string } {
        const props: OpenInSourcegraphProps = {
            repoPath: `github.com/${state.owner}/${state.repoName}`,
            rev: state.rev || '',
        }
        return {
            label: 'View Repository',
            ariaLabel: 'View repository on Sourcegraph',
            openProps: props,
        }
    }
}
