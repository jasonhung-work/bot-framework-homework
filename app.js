var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: '9d446f5a-3443-4df6-8fca-1d6861d6e5e3',
    appPassword: 'avpaaPRIB988#rdSGE93)-#'
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function (session) {
    console.log(session);
    session.send("You said: %s", session.message.text);
});

//password:avpaaPRIB988#rdSGE93)-# wmtikvZBKAF8467)](kLY7%