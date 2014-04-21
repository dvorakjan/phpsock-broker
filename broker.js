var wampio = require('wamp.io'),
    sockjs = require('sockjs'),
    connect = require('connect'),
    dnode = require('dnode');


// ----- Base HTTP server + static content -----
var server = connect()
    .use(connect.static(__dirname + '/public'))
    .listen(9000);
console.log('Socket server listening on 9000.')

// ----- WAMP server -----
var wamp = new wampio.Server();
var sockjsServer = sockjs.createServer({
    prefix: '/broadcast',
    sockjs_url: '/sockjs-0.3.js'
});
wamp.clientsByAlias = {};
sockjsServer.installHandlers(server);
sockjsServer.on('connection', function (client) {
    client.send = client.write;
    client.on('data', function (data) {
        client.emit('message', data);

        // TODO ukladat PubSub eventy do monga nebo posilat do PHP
    });
    client.on('end', function () {
        wamp.publish(client.uri+'#userOffline', client.alias);
    });

    client.rooms = {};
    wamp.onConnection(client);
});

// ----- dNode server -----
var dnodeServer = dnode(function (remote, conn) {
    this.getOnlineClients = function (callback) {
        callback(Object.keys(wamp.clientsByAlias))
    };

    this.callClient = function (alias, procedure, params, callback) {
        if (alias in wamp.clientsByAlias) {
            for (var i in wamp.clientsByAlias[alias]) {
                wamp.clientsByAlias[alias][i].call(procedure, params, function (res) {
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
dnodeServer.listen(7070);
console.log('DNode server listening on 7070.')


// FUKNCE BROKERU
// - HOTOVO poskytnout do PHP seznam aktivnich klientu
// - HOTOVO NATIVNE V WAMP.IO - predavat veskere zpravy v danem topicu vsem ostatnim subscriberum
// - HOTOVO RPC volani z PHP predat do JS a vysledek zpet
// - HOTOVO publish event z PHP predat vsem subscriberum
// - poskytnout do PHP seznam subscriberu daneho topicu
// - vsechna RPC volani z klienta predat pres DNode do PHP a vysledek zpet (spustit php dnode server pres commandlinu)
// - vsechny publish eventy od vsech klientu predavat do PHP (spoustet PHP skript pres commandlinu) - DAVKOVE??? - nebo jen ukladat do monga??
// - spravuje seznam mistnosti a klientu v nich, informuje ostatni klienty o pripojeni/odpojeni ostatnich klientu


var rooms = {};
wamp.on('call', function (procUri, args, cb, client) {
    // wamp.publish('http://ebrana.cz/news', {'a': 'bcauec uvodni zprava vid'})

    switch (procUri) {

        case 'roomCreate': // roomUri
            var hash = Math.round(Math.random() * 100000);
            rooms[args[0]] = {
                uri: args[0],
                hash: hash,
                users: [wamp.clients[client.id].alias]
            }
            cb(null, hash);
            break;

        case 'roomInvite': // userAlias, roomUri
            // pokud mistnost existuje a uzivatel, ktery chce pridat dalsiho v ni je
            if (args[1] in rooms && rooms[args[1]].users.indexOf(wamp.clients[client.id].alias) != -1) {
                // pokud uzivatel v seznamu uz neni
                if (rooms[args[1]].users.indexOf(args[0]) == -1) {
                    rooms[args[1]].users.push(args[0]);
                }
            }
            cb();
            break;

        case 'roomMessage': // roomUri, message
            var roomId = args[0];
            
            // TODO verejne mistnosti resit jako pubsub
            if (roomId in rooms && rooms[roomId].users.length <=1) {
                
                // for (var i in wamp.clients) {
                //     var alias = wamp.clients[i].alias;
                //     // TODO delivery confirmation
                //     for (var i in wamp.clientsByAlias[alias]) {
                //         wamp.clientsByAlias[alias][i].call('roomMessage', {room: roomId, message: args[1], author: {name: wamp.clients[client.id].alias}});
                //     }
                // }
            } else if (roomId in rooms && rooms[roomId].users.indexOf(wamp.clients[client.id].alias) != -1) {
                for (var i in rooms[roomId].users) {
                    var alias = rooms[roomId].users[i];
                    if (alias in wamp.clientsByAlias) {
                        // TODO delivery confirmation
                        for (var i in wamp.clientsByAlias[alias]) {
                            wamp.clientsByAlias[alias][i].call('roomMessage', {room: roomId, message: args[1], author: {name: wamp.clients[client.id].alias}});
                        }
                    }
                }
            } else {
                console.log('Invalid room or user.', args[0], wamp.clients[client.id].alias, rooms[roomId]);
            }
            cb();
            break;

        case 'registerUsername': // username, uri
            wamp.clients[client.id].alias = args[0];
            wamp.clients[client.id].uri = args[1];
            console.log(args[1]+'#userOnline')
            wamp.publish(args[1]+'#userOnline', args[0]);

            if (!(args[0] in wamp.clientsByAlias)) {
                wamp.clientsByAlias[args[0]] = [];
            }
            wamp.clientsByAlias[args[0]].push(client);
            console.log('client '+args[0]+' joined, online clients '+Object.keys(wamp.clientsByAlias).join(','))
            cb(null, Object.keys(wamp.clientsByAlias));
            break;

        case 'isEven':
//            wamp.clientsByAlias['jan-dvorak'].call('test', {param1: 12444}, function (res) {
//                console.log(res)
//            })

            cb(null, args[0] % 2 == 0);
            break;
    }

});
