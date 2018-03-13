import * as React from 'react'

const info =
    'Install the Sourcegraph extension in Phabricator to enable non-debug use for all users. The browser extension is for admin use and debugging only.'

export const AdminWarning = () => (
    <div className="phui-two-column-content">
        <div className="sg-alert sg-alert-danger site-alert phabricator-alert" title={info}>
            <a
                className="site-alert__link"
                href="https://about.sourcegraph.com/docs/features/phabricator-extension#admin-mode-single-user"
            >
                Sourcegraph: admin mode enabled
            </a>
        </div>
    </div>
)
