var wampio  = require('wamp.io'),
    sockjs  = require('sockjs'),
    connect = require('connect'),
    dnode   = require('dnode');



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
sockjsServer.on('connection', function(client) {
  client.send = client.write;
  client.on('data', function(data) {
    client.emit('message', data);

    // TODO ukladat PubSub eventy do monga nebo posilat do PHP
  });
  client.on('end', function(a,b,c) {
    wamp.publish('http://ebrana.cz/chat', client.alias+' disconnect');
  });

  wamp.onConnection(client);
});

// ----- dNode server -----
var dnodeServer = dnode(function (remote, conn) {
    this.getOnlineClients = function (callback) { 
      callback(Object.keys(wamp.clientsByAlias)) 
    };

    this.callClient       = function (alias, procedure, params, callback) { 
      if (alias in wamp.clientsByAlias) {
        wamp.clientsByAlias[alias].call(procedure, params, function(res){
          callback(res);
        })
      } else {
        callback();
      }
    };

    this.publish          = function (topic, message, callback) { 
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



wamp.on('call', function(procUri, args, cb, client) {
  wamp.publish('http://ebrana.cz/news', {'a':'bcauec'})

  switch (procUri) {
    
    case 'registerClientAlias': 
      wamp.clients[client.id].alias = args[0];
      wamp.clientsByAlias[args[0]] = client;
      break;
    
    case 'isEven':
      wamp.clientsByAlias['jan-dvorak'].call('test', {param1:12444}, function(res){
        console.log(res)
      })

      cb(null, args[0] % 2 == 0);
      break;
  }
  
});
