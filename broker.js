var wampio = require('wamp.io'),
    sockjs = require('sockjs'),
    connect = require('connect'),
    dnode = require('dnode');


var program = require('commander');

program
  .version('0.0.1')
  .option('-w, --wsport <n>', 'Set WebSocket listen port', parseInt)
  .option('-d, --dnodeport <n>', 'Set dnode listen port', parseInt)
  .option('-e, --echo', 'Only echo every WebSocket message. Using for benchmarking.')
  .parse(process.argv);


// ----- Komponenty reagujici na udalosti WS a dNode serveru -----
// TODO components vyseknout ven a udelat funkcionalne
var chat        = require('./components/chat.js');
var chatHistory = require('./components/chatHistory.js');
var components  = {
    list: [chat, chatHistory],
    emit: function() {
        for (var i in this.list) {
            this.list[i].emit.apply(this.list[i], arguments);
        }
    },
    on: function(evt, callback) {
        for (var i in this.list) {
            this.list[i].on(evt, callback);
        }
    }
};


// ----- Base HTTP server + static content -----
var server = connect()
    .use(connect.static(__dirname + '/public'))
    .listen(program.wsport || 9000);

console.log('Socket server listening on '+(program.wsport || 9000));
if (program.echo) console.log('WARNING: starting in echo mode for benchmarking, all other functions are disabled.');


// ----- WAMP server -----
var wamp = new wampio.Server();
var sockjsServer = sockjs.createServer({
    prefix: '/broadcast',
    sockjs_url: '/sockjs-0.3.js',
    log : function(){}
});
sockjsServer.installHandlers(server);
sockjsServer.on('connection', function (client) {
    // Nekompatibilni rozhrani mezi WS a SOCKJS - nutne prekonvertovat 
    client.send = client.write;
    client.on('data', function (data) {
        if (program.echo) {
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


// ----- dNode server -----
var dnodeServer = dnode(function (remote, conn) {
    this.getOnlineClients = function (callback) {
        callback(Object.keys(chat.clientsByAlias))
    };

    this.callClient = function (alias, procedure, params, callback) {
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
dnodeServer.listen(program.dnodeport || 7070);
console.log('DNode server listening on '+(program.dnodeport || 7070))


// ----- Redirect all RPC calls to chat -----
wamp.on('call', function (procUri, args, cb, client) {
    components.emit.apply(components, [procUri, client, cb].concat(args));
});

// ----- Events to call from components -----
components.on('call',function(client, method, args, callback){
    client.call(method, args, callback);
});

components.on('publish',function(topic, args){
    wamp.publish(topic, args);
});