// dNode server component for connections from other languages than node.js
module.exports = dnode = new (require("events").EventEmitter)();
// on component load dnode server should be created and start to listen for incoming connections
dnode.on('load', function (manager) {
    var clients = manager.getComponent('components/clients.js');
    this.server = require('dnode')(function (remote, conn) {
        var methods = this;
        this.getOnlineClients = function (callback) {
            callback(Object.keys(clients.clientsByAlias));
        };
        this.callClient = function (alias, procedure, params, callback) {
            dnode.logger.info(alias, procedure, params, callback);
            if (alias in clients.clientsByAlias) {
                dnode.logger.info('recieved call ' + procedure + ' for ' + alias + ' - sending to ' + clients.clientsByAlias[alias].length + ' clients');
                for (var i in clients.clientsByAlias[alias]) {
                    clients.clientsByAlias[alias][i].call(procedure, params, function (res) {
                        callback && callback(res);
                    });
                }
            }
            else {
                dnode.logger.info('recieved call ' + procedure + ' for ' + alias + ' with params ' + params + '- nobody to recieve :-(');
                callback && callback();
            }
        };
        this.callClients = function (aliases, procedure, params, callback) {
            console.log('aliases', aliases);
            for (var i in aliases) {
                // TODO call callback when all clients done
                methods.callClient(aliases[i], procedure, params, function () { });
            }
            callback();
        };
        this.authToken = function (token, tokenDetails, callback) {
            manager.getComponent('components/auth.js').addToken(token, tokenDetails);
            callback();
        };
        this.publish = function (topic, message, callback) {
            dnode.logger.info('publishing topic ' + topic);
            manager.wamp.publish(topic, message);
            callback();
        };
    });
    this.server.listen(this.config.port);
    this.logger.info('DNode server listening on ' + this.config.port);
});
//# sourceMappingURL=dnode.js.map