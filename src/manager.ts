import Component from './component'

export default class Manager {
  private wamp
  private components: Component[] = []

  public emit(event, ...args) {
    Object.entries(this.components).forEach(([, component]) =>
      component.emit.apply(component, [event, ...args])
    )
  }

  public on(event, callback) {
    Object.entries(this.components).forEach(([, component]) => component.on(event, callback))
  }

  public load(nconf) {
    for (const path in nconf.get('components')) {
      const ComponentClass = require('./' + path + '.ts').default

      const config = nconf.get('components')[path]
      const logger = require('bunyan').createLogger({ name: path })
      logger.info('loading component ' + path)

      this.components[path] = new ComponentClass(this, logger, config)
    }
    this.emit('load')

    return this
  }

  public register(wamp) {
    this.wamp = wamp

    // redirect all RPC calls to components
    wamp.on('call', (procedure, args, cb, client, _) => {
      this.emit(procedure, ...[client, cb, ...args])
    })

    // redirect call events from components to client
    this.on('call', (client, method, args, callback) => {
      client.call(method, args, callback)
    })

    this.on('publish', (topic, args) => {
      wamp.publish(topic, args)
    })

    return this
  }

  public getWamp() {
    return this.wamp
  }

  public getComponent(name) {
    return this.components[name]
  }
}
