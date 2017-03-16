module.exports = auth = new (require("events").EventEmitter)();

auth.on('load', function(){
    if (this.config.persistTokens) {
        this.storage = require('node-persist');
        this.storage.initSync();

        // initial load after server restart
        this.loadTokens();
    }

    // init tokens object when nothing loaded from persistent storage
    if (typeof this.tokens == 'undefined') {
        this.tokens = {};
        this.saveTokens();
    }

    // clean expired tokens every minute
    setInterval(function(){
        auth.cleanTokens();
    }, 60*1000);
});

// check if token is in stored tokens array
auth.validateToken = function(token) {
    var validTokens = Object.keys(this.tokens);
    return validTokens.indexOf(token) >= 0;
}

auth.getToken = function(token) {
    return this.tokens[token];
}

// load from persistent storage
auth.loadTokens = function() {
    this.tokens = this.storage.getItemSync('tokens');
}

// persist tokens to persistent storage
auth.saveTokens = function() {
    if (this.config.persistTokens) {
        this.storage.setItemSync('tokens', this.tokens);
    }
}

// clean tokend added more than five hours ago
auth.cleanTokens = function() {
    for (var hash in this.tokens) {
        var token = this.tokens[hash];
        if ((token.timeAdded + 5*60*60*1000) < (new Date().getTime())) {
            delete this.tokens[hash];
            this.saveTokens();
            this.logger.info('token '+hash+' expired - deleting');
        }
    }
}

// add new token to collection with actual time for later expiration check and save to persistent storage
auth.addToken = function(token, details) {
    details = details || {};
    details.timeAdded = new Date().getTime();

    this.logger.info('adding token ', token, details);

    this.tokens[token] = details;
    this.saveTokens();
}



