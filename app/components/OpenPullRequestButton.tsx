import * as React from 'react'
import { GitHubMode } from '../github'
import * as github from '../github/util'
import { eventLogger, openEditorEnabled, sourcegraphUrl } from '../util/context'
import { Button } from './Button'

export const OpenPullRequestButton: React.StatelessComponent<{}> = () => {
    if (!openEditorEnabled) {
        return null
    }
    const url = window.location.href
    const state = github.getGitHubState(url)
    if (!state || state.mode !== GitHubMode.PullRequest) {
        return null
    }
    const props = {
        url: `${sourcegraphUrl}/open?review=${url}`,
        label: 'Open PR in Editor',
        ariaLabel: 'Open pull request in Sourcegraph Editor',
        className: 'btn btn-sm',
        target: 'sourcegraph-editor',
        onClick: () => {
            eventLogger.logOpenPullRequestClicked({ url })
        },
    }
    return <Button {...props} />
}
