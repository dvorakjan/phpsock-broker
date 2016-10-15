module.exports = auth = new (require("events").EventEmitter)();

auth.on('load', function(){
    this.storage = require('node-persist');
    this.storage.initSync();

    // initial load after server restart
    this.loadTokens();

    // init tokens object when nothing loaded from persistent storage
    if (typeof this.tokens == 'undefined') {
        this.tokens = {};
        this.saveTokens();
    }

    // clean expired tokens every minute
    setInterval(function(){
        auth.cleanTokens();
    }, 60*1000);

    this.logger.info('stored tokens', this.tokens);
});

// check if token is in stored tokens array
auth.validateToken = function(token) {
    var validTokens = Object.keys(this.tokens);
    return validTokens.indexOf(token) >= 0;
}

// load from persistent storage
auth.loadTokens = function() {
    this.tokens = this.storage.getItemSync('tokens');
}

// persist tokens to persistent storage
auth.saveTokens = function() {
    this.storage.setItemSync('tokens', this.tokens);
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
auth.addToken = function(token) {
    this.logger.info('adding token ', token);
    this.tokens[token] = {
        timeAdded: (new Date().getTime())
    };
    this.saveTokens();

    this.logger.info('stored tokens', this.tokens);
}



