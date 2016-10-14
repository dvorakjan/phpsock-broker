module.exports = users = new (require( "events" ).EventEmitter)();

users.clients = {};
users.clientsByAlias = {};

// --------------------------------------------
users.on('connect', function(wamp, client) {
	this.wamp = wamp;
	this.clients[client.id] = client;

    // this.emit('call', client, 'alert', 'Wellcome');
})

// --------------------------------------------
users.on('disconnect', function(client) {
	delete this.clients[client.id];

	// foreach connected clients list and remove that who has disconnected
    for (var i in this.clientsByAlias[client.alias] ) {
        if (this.clientsByAlias[client.alias][i] == client) {
            this.clientsByAlias[client.alias].splice(i, 1);
        }
    }

    // if it was last instance of that user, delete it at all
    if (typeof this.clientsByAlias[client.alias] !== 'undefined' && this.clientsByAlias[client.alias].length == 0) {
        delete this.clientsByAlias[client.alias];
        this.emit('publish', client.uri+'#userOffline', client.alias);
    }

    this.logger.info('client '+client.alias+' left', {id:client.id, online:Object.keys(this.clientsByAlias)});
})

// --------------------------------------------
users.on('registerUsername', function(client, callback, alias, domain) {
	this.clients[client.id].alias = alias;
    this.clients[client.id].uri   = domain;

    // TODO nevim jestli by se nemel produkovat pubsub jen kdyz se jedna o pripojeni prvni instance daneho uzivatele, jako je tomu u odpojeni (pubsub az po odpojeni posledniho)
    this.emit('publish',domain+'#userOnline', alias);

    if ( typeof this.clientsByAlias[alias] == 'undefined' ) {
        this.clientsByAlias[alias] = [client];
    } else {
    	this.clientsByAlias[alias].push(client);	
    }
    
    this.logger.info('client '+domain+'#'+alias+' joined', {id:client.id, online:Object.keys(this.clientsByAlias)})
    callback(null, Object.keys(this.clientsByAlias));
})
