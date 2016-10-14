var wampio  = require('wamp.io'),
    sockjs  = require('sockjs'),
    connect = require('connect'),
    dnode   = require('dnode'),
    bunyan  = require('bunyan'),
    program = require('commander'),
    config  = require('nconf');

// for --help output only - all config is parsed using "config" object
program
  .version('0.0.1')
  .option('-w, --wsport <n>',    'Set WebSocket listen port', parseInt)
  .option('-d, --dnodeport <n>', 'Set dnode listen port', parseInt)
  .option('-e, --echo',          'Only echo every WebSocket message. Using for benchmarking.')
  .parse(process.argv);

// compose config object using various sources
config
    .argv()
    .env()
    .file('custom', {file: 'custom/config.json'})
    .file({file: 'defaults.json'})
    .defaults({'wsport':9000, 'dnodeport': 7070});

// output log in structured JSON format (in CLI use "node broker.js | bunyan")
var logger = bunyan.createLogger({name: "broker"});

// load components according to config
var components = require('./components').load(config);

// base HTTP server + static content
var server = connect()
    .use(connect.static(__dirname + '/public'))
    .listen(config.get('wsport'));

logger.info('Socket server listening on '+(config.get('wsport')));
if (config.get('echo')) logger.warn('WARNING: starting in echo mode for benchmarking, all other functions are disabled.');


// WAMP + SockJS server
var wamp = new wampio.Server();
var sockjsServer = sockjs.createServer({
    prefix: '',
    sockjs_url: '/sockjs-0.3.js',
    log : function(){}
});
sockjsServer.installHandlers(server);
sockjsServer.on('connection', function (client) {
    // TODO auth
    // client.close(1,'neser');

    // manual mapping for incopatible WS <--> SOCKJS interface
    client.send = client.write;
    client.on('data', function (data) {
        if (config.echo) {
            client.write(data);
            return;
        }
        client.emit('message', data);
    });
    client.on('end', function () {
        components.emit('disconnect', client);
    });
    wamp.onConnection(client);
    components.emit('connect', wamp, client);
});

// dNode server for connections from other languages than node.js
var dnodeServer = dnode(function (remote, conn) {
    this.getOnlineClients = function (callback) {
        callback(Object.keys(chat.clientsByAlias))
    };

    this.callClient = function (alias, procedure, params, callback) {
        // console.log('dnode rx callClient', alias, procedure)
        if (alias in chat.clientsByAlias) {
            for (var i in chat.clientsByAlias[alias]) {
                chat.clientsByAlias[alias][i].call(procedure, params, function (res) {
                    callback(res);
                })
            }
        } else {
            callback();
        }
    };

    this.publish = function (topic, message, callback) {
        wamp.publish(topic, message);
        callback();
    };
});
dnodeServer.listen(config.get('dnodeport'));
logger.info('DNode server listening on '+config.get('dnodeport'))

// redirect all RPC calls to components
wamp.on('call', function (procUri, args, cb, client, aa) {
    components.emit.apply(components, [procUri, client, cb].concat(args));
});

// events to call from components
components.on('call',function(client, method, args, callback){
    client.call(method, args, callback);
});
components.on('publish',function(topic, args){
    wamp.publish(topic, args);
});
