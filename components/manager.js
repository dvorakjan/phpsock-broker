module.exports = {

    components: [],

    emit: function() {
        for (var i in this.components) {
            this.components[i].emit.apply(this.components[i], arguments);
        }
    },

    on: function(evt, callback) {
        for (var i in this.components) {
            this.components[i].on(evt, callback);
        }
    },

    // for each component in config require its module, init logger and add it to collection
    load: function(config) {

        for (var path in config.get('components')) {
            var component = require('../'+path);

            component.config = config.get('components')[path];
            component.logger = require('bunyan').createLogger({name: path.replace('.js','')});
            component.logger.info('loading component '+path);

            this.components[path] = component;
        }

        // call init when all components registered in manager
        for (var path in this.components) {
            this.components[path].emit('load', this);
        }

        return this;
    },

    register: function(wamp) {
        var manager = this;
        manager.wamp = wamp;

        // redirect all RPC calls to components
        wamp.on('call', function (procUri, args, cb, client, aa) {
            manager.emit.apply(manager, [procUri, client, cb].concat(args));
        });

        // events to call from components
        manager.on('call',function(client, method, args, callback){
            client.call(method, args, callback);
        });

        manager.on('publish',function(topic, args){
            wamp.publish(topic, args);
        });

        return this;
    },

    getComponent: function(name) {
        return this.components[name];
    }


}