import * as persist from 'node-persist'
import Component from '../component'

interface IAuthConfig {
  persistTokens: boolean
}

export default class Auth extends Component {
  private config: IAuthConfig
  private storage
  private tokens = {}

  constructor(manager, logger, config: IAuthConfig) {
    super(manager, logger)
    this.config = config

    this.on('load', this.onLoad.bind(this))
  }

  public onLoad() {
    if (this.config.persistTokens) {
      this.storage = persist
      this.storage.initSync()

      // initial load after server restart
      this.loadTokens()
    }

    // init tokens object when nothing loaded from persistent storage
    if (typeof this.tokens === 'undefined') {
      this.tokens = {}
      this.saveTokens()
    }

    // clean expired tokens every minute
    setInterval(() => {
      this.cleanTokens()
    }, 60 * 1000)
  }

  // add new token to collection with actual time for later expiration check and save to persistent storage
  public addToken(token, details) {
    details = details || {}
    details.timeAdded = new Date().getTime()

    this.logger.info('adding token ', token, details)

    this.tokens[token] = details
    this.saveTokens()
  }

  // check if token is in stored tokens array
  public validateToken(token) {
    const validTokens = Object.keys(this.tokens)
    return validTokens.indexOf(token) >= 0
  }

  private getToken(token) {
    return this.tokens[token]
  }

  // load from persistent storage
  private loadTokens() {
    this.tokens = this.storage.getItemSync('tokens')
  }

  // persist tokens to persistent storage
  private saveTokens() {
    if (this.config.persistTokens) {
      this.storage.setItemSync('tokens', this.tokens)
    }
  }

  // clean tokend added more than five hours ago
  private cleanTokens() {
    for (const hash in this.tokens) {
      const token = this.tokens[hash]
      if (token.timeAdded + 5 * 60 * 60 * 1000 < new Date().getTime()) {
        delete this.tokens[hash]
        this.saveTokens()
        this.logger.info('token ' + hash + ' expired - deleting')
      }
    }
  }
}
