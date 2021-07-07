import * as bunyan from 'bunyan'
import * as program from 'commander'
import * as connect from 'connect'
import * as config from 'nconf'
import * as sockjs from 'sockjs'
import * as wampio from 'wamp.io'

import Auth from './components/auth'
import Manager from './manager'

// for --help output only - all config is parsed using "config" object
program
  .version('0.0.1')
  .option('-w, --wsport <n>', 'Set WebSocket listen port', parseInt)
  .option('-d, --dnodeport <n>', 'Set dnode listen port', parseInt)
  .option('-e, --echo', 'Only echo every WebSocket message. Using for benchmarking.')
  .parse(process.argv)

// compose config object using various sources
config
  .argv()
  .env()
  .file('custom', { file: 'custom/config.json' })
  .file({ file: 'defaults.json' })
  .defaults({ wsport: 9000, dnodeport: 7070 })

// output log in structured JSON format (in CLI use "node broker.js | bunyan")
const logger = bunyan.createLogger({ name: 'broker' })

// base HTTP server + static content
const server = connect()
  .use(connect.static(__dirname + '/public'))
  .listen(config.get('wsport'))

logger.info('Socket server listening on ' + config.get('wsport'))
if (config.get('echo')) {
  logger.warn('WARNING: starting in echo mode for benchmarking, all other functions are disabled.')
}

// create WAMP + SockJS server (we use prefix for auth token)
const wamp = new wampio.Server()
const sockjsServer = sockjs.createServer({
  // log: () => {},
  prefix: '/[a-z0-9]*',
  sockjs_url: '/sockjs-0.3.js'
})
sockjsServer.installHandlers(server)

// load and init components according to config
const manager = new Manager().load(config).register(wamp)

sockjsServer.on('connection', client => {
  // check validity of auth token from connection URL prefix
  const auth = manager.getComponent('components/auth') as Auth

  const authToken = client.url.split('/')[1]
  if (!auth.validateToken(authToken)) {
    logger.error('invalid token ', authToken)
    client.close(0, 'invalid auth token')
  } else {
    logger.info('valid token ', authToken)
    client.authToken = authToken
  }

  // manual mapping for incopatible WS <--> SOCKJS interface
  client.send = client.write
  client.on('data', data => {
    if (config.get('echo')) {
      client.write(data)
      return
    }
    client.emit('message', data)
  })
  wamp.onConnection(client)

  // pass connect and disconnect events to components manager
  manager.emit('connect', wamp, client)
  client.on('end', () => {
    manager.emit('disconnect', client)
  })
})
