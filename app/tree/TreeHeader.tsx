import * as React from 'react'
import { ShowFileTree, ToggleFileTree } from '../components/Icons'
import { getPlatformName, sourcegraphUrl } from '../util/context'

interface Props {
    uri: string
    rev: string | undefined
    onClick: () => void
    toggled: boolean
}

export class TreeHeader extends React.Component<Props, {}> {

    public render(): JSX.Element | null {
        const { uri, rev } = this.props
        let url = `${sourcegraphUrl}/${uri}`
        if (rev) {
            url = `${url}@${rev}`
        }
        url = `${url}?utm_source=${getPlatformName()}`

        return (
            <div className='sg-tree__header' >
                <div className='sg-tree__header-box'>
                    {this.props.toggled ?
                        <ToggleFileTree className='sg-tree__header-toggle' onClick={this.props.onClick} /> :
                        <ShowFileTree className='sg-tree__header-toggle' onClick={this.props.onClick} />
                    }
                </div>
            </div>
        )
    }
}
