var collection = {
    list: [],
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

module.exports = {
    // for each component in config require its module, init logger and add to collection
    load: function(config){
        for (var path in config.get('components')) {
            var component = require('./'+path);      
            
            component.config = config.get('components')[path];      
            component.logger = require('bunyan').createLogger({name: path.replace('.js','')});
            component.emit('load');
            component.logger.info('init')

            collection.list.push(component);
        }

        return collection;
    }
}