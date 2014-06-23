// FUKNCE BROKERU
// - HOTOVO poskytnout do PHP seznam aktivnich klientu
// - HOTOVO NATIVNE V WAMP.IO - predavat veskere zpravy v danem topicu vsem ostatnim subscriberum
// - HOTOVO RPC volani z PHP predat do JS a vysledek zpet
// - HOTOVO publish event z PHP predat vsem subscriberum
// - poskytnout do PHP seznam subscriberu daneho topicu
// - vsechna RPC volani z klienta predat pres DNode do PHP a vysledek zpet (spustit php dnode server pres commandlinu)
// - vsechny publish eventy od vsech klientu predavat do PHP (spoustet PHP skript pres commandlinu) - DAVKOVE??? - nebo jen ukladat do monga??
// - spravuje seznam mistnosti a klientu v nich, informuje ostatni klienty o pripojeni/odpojeni ostatnich klientu
// TODO pro odstineni WAMPU udelat publikovani udalosti jako emit a v brokeru zachytavat onPublish

var EventEmitter = require( "events" ).EventEmitter;

var chat = new EventEmitter();
module.exports = chat;

chat.rooms = {};
chat.clients = {};
chat.clientsByAlias = {};


// --------------------------------------------
chat.on('connect', function(wamp, client) {
	this.wamp = wamp;
	this.clients[client.id] = client;

	client.rooms = {};
})

// --------------------------------------------
chat.on('disconnect', function(client) {
	delete this.clients[client.id];

	// Projit seznam pripojenych klientu s danym username a toho co se odpojil odstranime
    for (var i in this.clientsByAlias[client.alias] ) {
        if (this.clientsByAlias[client.alias][i] == client) {
            this.clientsByAlias[client.alias].splice(i, 1);
        }
    }

    // Pokud to byla posledni instance daneho uzivatele, smazeme ho uplne
    if (typeof this.clientsByAlias[client.alias] !== 'undefined' && this.clientsByAlias[client.alias].length == 0) {
        delete this.clientsByAlias[client.alias];
        this.emit('publish', client.uri+'#userOffline', client.alias);
    }

    console.log('client '+client.alias+' left - id '+client.id+', online clients '+Object.keys(this.clientsByAlias).join(','));
})

// --------------------------------------------
chat.on('registerUsername', function(client, callback, alias, domain) {
	this.clients[client.id].alias = alias;
    this.clients[client.id].uri   = domain;

    // TODO nevim jestli by se nemel produkovat pubsub jen kdyz se jedna o pripojeni prvni instance daneho uzivatele, jako je tomu u odpojeni (pubsub az po odpojeni posledniho)
    this.emit('publish',domain+'#userOnline', alias);

    if ( typeof this.clientsByAlias[alias] == 'undefined' ) {
        this.clientsByAlias[alias] = [client];
    } else {
    	this.clientsByAlias[alias].push(client);	
    }
    
    console.log('client '+alias+' joined - id '+client.id+', online clients '+Object.keys(this.clientsByAlias).join(','))
    cb(null, Object.keys(this.clientsByAlias));
})

// --------------------------------------------
chat.on('roomCreate', function(client, callback, roomUri) {
    var hash = Math.round(Math.random() * 100000);
    this.rooms[roomUri] = {
        uri: roomUri,
        hash: hash,
        users: [this.clients[client.id].alias]
    }
    callback(null, hash);
});

// --------------------------------------------
chat.on('roomInvite', function(client, callback, userAlias, roomUri) {
    // pokud mistnost existuje a uzivatel, ktery chce pridat dalsiho v ni je
    if (roomUri in this.rooms && this.rooms[roomUri].users.indexOf(this.clients[client.id].alias) != -1) {
        // pokud uzivatel v seznamu uz neni
        if (this.rooms[roomUri].users.indexOf(userAlias) == -1) {
            this.rooms[roomUri].users.push(userAlias);
        }
    }
    callback();
});

// --------------------------------------------
chat.on('roomMessage', function(client, callback, roomId, message) {
    
    // TODO verejne mistnosti resit jako pubsub
    // if (roomId in rooms && rooms[roomId].users.length <=1) {
    // }

    if (roomId in this.rooms && this.rooms[roomId].users.indexOf(this.clients[client.id].alias) != -1) {
    	// kazdemu uzivateli v mistnosti
        for (var i in this.rooms[roomId].users) {
            var alias = this.rooms[roomId].users[i];
            if (alias in this.clientsByAlias) {
            	// kazde instanci uzivatele
                for (var i in this.clientsByAlias[alias]) {
                	this.emit('call', this.clientsByAlias[alias][i], 'roomMessage', {room: roomId, message: message, author: {name: this.clients[client.id].alias}}, function(result){
                        // TODO delivery confirmation
                        // console.log('roomMessage result ', result);
                    });
                }
            }
        }
    } else {
        console.log('Invalid room or user.', roomId, this.clients[client.id].alias, this.rooms[roomId]);
    }
    cb();
});
