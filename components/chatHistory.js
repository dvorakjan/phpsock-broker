var EventEmitter = require( "events" ).EventEmitter,
    mongojs      = require("mongojs");

module.exports = chatHistory = new EventEmitter();

// Connect to MongoDB
var db = mongojs.connect('hypnos.ebrana.cz/chat', ['chat_messages']);


// --------------------------------------------
chatHistory.on('roomCreate', function(client, callback, roomUri) {
    
});

// --------------------------------------------
chatHistory.on('roomInvite', function(client, callback, userAlias, roomUri) {
    
});

// TODO where by domain
chatHistory.on('loadRoomMessages', function(client, callback, roomUri) {
    db.chat_messages.find({room: roomUri}, function(err, messages) {
      if( err || !messages) 
        callback(null, []);
      else 
        callback(null, messages); 
    });
});

// --------------------------------------------
chatHistory.on('roomMessage', function(client, callback, roomId, message) {
    db.chat_messages.save({
        message: message,
        username: client.alias,
        domain: client.uri,
        room: roomId,
        date: new Date()
    }, function(err, saved){ 
        if( err || !saved )
            console.log(err, saved)
    });    
});