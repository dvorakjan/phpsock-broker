// dNode server component for connections from other languages than node.js
import Component from '../component'
import Auth from './auth'
import Clients from './clients'

interface IDnodeConfig {
  port: number
}

export default class DNode extends Component {
  private server
  private config: IDnodeConfig

  constructor(manager, logger, config: IDnodeConfig) {
    super(manager, logger)
    this.config = config

    this.on('load', this.onLoad.bind(this))
  }

  // on component load dnode server should be created and start to listen for incoming connections
  public onLoad() {
    const clients: Clients = this.manager.getComponent('components/clients') as Clients
    const manager = this.manager

    this.server = require('dnode')(function(remote, conn) {
      this.getOnlineClients = callback => {
        callback(Object.keys(clients.clientsByAlias))
      }

      this.callClient = (alias, procedure, params, callback) => {
        this.logger.info(alias, procedure, params, callback)
        if (alias in clients.clientsByAlias) {
          this.logger.info(
            'recieved call ' +
              procedure +
              ' for ' +
              alias +
              ' - sending to ' +
              clients.clientsByAlias[alias].length +
              ' clients'
          )
          for (const i in clients.clientsByAlias[alias]) {
            clients.clientsByAlias[alias][i].call(procedure, params, res => {
              callback && callback(res)
            })
          }
        } else {
          this.logger.info(
            'recieved call ' +
              procedure +
              ' for ' +
              alias +
              ' with params ' +
              params +
              '- nobody to recieve :-('
          )
          callback && callback()
        }
      }

      this.callClients = (aliases, procedure, params, callback) => {
        this.logger.log('aliases', aliases)
        for (const i in aliases) {
          // TODO call callback when all clients done
          this.callClient(aliases[i], procedure, params, () => {})
        }
        callback()
      }

      this.authToken = (token, tokenDetails, callback) => {
        const authComponent = manager.getComponent('components/auth') as Auth
        authComponent.addToken(token, tokenDetails)
        callback()
      }

      this.publish = (topic, message, callback) => {
        this.logger.info('publishing topic ' + topic)
        manager.getWamp().publish(topic, message)
        callback()
      }
    })

    const port = this.config.port
    this.server.listen(port)
    this.logger.info('DNode server listening on ' + port)
  }
}
