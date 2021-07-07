import * as Bunyan from 'bunyan'
import * as EventEmitter from 'events'
import { Provider as Nconf } from 'nconf'
import Manager from './manager'

export default abstract class Component extends EventEmitter {
  protected logger: Bunyan
  protected manager: Manager

  constructor(manager, logger) {
    super()
    this.manager = manager
    this.logger = logger
  }
}
