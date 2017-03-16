var wampio  = require('wamp.io'),
    sockjs  = require('sockjs'),
    connect = require('connect'),
    bunyan  = require('bunyan'),
    program = require('commander'),
    config  = require('nconf');

// for --help output only - all config is parsed using "config" object
program
  .version('0.0.1')
  .option('-w, --wsport <n>',    'Set WebSocket listen port', parseInt)
  .option('-e, --echo',          'Only echo every WebSocket message. Using for benchmarking.')
  .parse(process.argv);

// compose config object using various sources
config
    .argv()
    .env()
    .file('custom', {file: 'custom/config.json'})
    .file({file: 'defaults.json'})
    .defaults({'wsport':9001});

// output log in structured JSON format (in CLI use "node broker.js | bunyan")
var logger = bunyan.createLogger({name: "broker"});

// base HTTP server + static content
var server = connect()
    .use(connect.static(__dirname + '/public'))
    .listen(config.get('wsport'));

logger.info('Socket server listening on '+(config.get('wsport')));
if (config.get('echo')) logger.warn('WARNING: starting in echo mode for benchmarking, all other functions are disabled.');

// create WAMP + SockJS server (we use prefix for auth token)
var wamp = new wampio.Server();
var sockjsServer = sockjs.createServer({
    prefix: '/[a-z0-9]*',
    sockjs_url: '/sockjs-0.3.js',
    log : function(){}
});
sockjsServer.installHandlers(server);

// load and init components according to config
var manager = require('./components/manager').load(config).register(wamp);

sockjsServer.on('connection', function (client) {
    // check validity of auth token from connection URL prefix
    var auth      = manager.getComponent('components/auth.js');
    var authToken = client.url.split('/')[1];
    if (!auth.validateToken(authToken)) {
        logger.error('invalid token ', authToken);
        client.close(0, 'invalid auth token');
    } else {
        logger.info('valid token ', authToken);
        client.authToken = authToken;
    }

    // manual mapping for incopatible WS <--> SOCKJS interface
    client.send = client.write;
    client.on('data', function (data) {
        if (config.echo) {
            client.write(data);
            return;
        }
        client.emit('message', data);
    });
    wamp.onConnection(client);

    // pass connect and disconnect events to components manager
    manager.emit('connect', wamp, client);
    client.on('end', function () {
        manager.emit('disconnect', client);
    });
});