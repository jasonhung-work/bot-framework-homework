/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var express = require("express");
var app = express();
var port = process.env.PORT || 3978;
var http = require("http");
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var fs = require('graceful-fs');
// Setup Restify Server
var server = http.Server(app).listen(port, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
app.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
app.use(express.static("resource"));
app.get('/download/:file', function (request, response) {
    var filename = request.params.file;
    var stream = require('fs').createReadStream(__dirname + '/resource/' + filename);
    stream.pipe(response);
    response.clearCookie();
});
var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var inMemoryStorage = new builder.MemoryBotStorage();
var userStore = [];
var bot = new builder.UniversalBot(connector, function (session) {
    var address = session.message.address;
    userStore.push(address);

    // end current dialog
    session.endDialog('You\'ve been invited to a survey! It will start in a few seconds...');
    console.log(session.userData);
}).set('storage', inMemoryStorage); // Register in-memory storage

setInterval(function () {
    var newAddresses = userStore.splice(0);
    console.log(newAddresses);
    newAddresses.forEach(function (address) {

        console.log('Starting survey for address:', address);

        // new conversation address, copy without conversationId
        var newConversationAddress = Object.assign({}, address);
        delete newConversationAddress.conversation;

        // start survey dialog
        bot.beginDialog(newConversationAddress, 'language', null, function (err) {
            if (err) {
                // error ocurred while starting new conversation. Channel not supported?
                bot.send(new builder.Message()
                    .text('This channel does not support this operation: ' + err.message)
                    .address(address));
            }
        });

    });
}, 5000);


bot.dialog('isRepair', [
    function (session, args) {
        console.log("-----isRepair part-----");
        session.userData.language = args.intent.matched[0];
        session.send("歡迎光臨大同世界科技０８００報修系統，您可以在這裡取得大同世界科技客服中心的服務");
        builder.Prompts.choice(session, "請問您是要進行故障報修嗎?", "yes|no", { listStyle: 3 });
    },
    function (session, results) {
        if (results.response.entity == "yes") {
            session.userData.isRepair = "yes";
            builder.Prompts.number(session, "請輸入您的統一編號");
        }
        else {
            session.userData.isRepair = "no";
            session.save();
            session.send("謝謝您的光臨，願您一切順心，再見！").endDialog();
        }
    },
    function (session, results) {
        session.userData.customerNo = results.response;
        session.send(`您輸入的是: ${session.userData.customerNo}`);
        builder.Prompts.text(session, "請輸入您電話號碼");
    },
    function (session, results) {
        session.userData.phone = results.response;
        session.save();
        session.send(`您輸入的是: ${session.userData.phone} <br/> 謝謝您的光臨，願您一切順心，再見！`).endDialog();
    }
]).triggerAction({ matches: /^(中文|English|简中)/i });;

// Add dialog to return list of shirts available
bot.dialog('language', function (session) {
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
            .title("請選擇您要使用的語言")
            .text("What's your preferred language?")
            .images([builder.CardImage.create(session, 'https://jason-hung.azurewebsites.net/download/language.jpg')])
            .buttons([
                builder.CardAction.imBack(session, "中文", "中文 (1)"),
                builder.CardAction.imBack(session, "English", "English (1)"),
                builder.CardAction.imBack(session, "简中", "簡中 (1)")
            ])
    ]);
    session.send(msg).endDialog();
}).triggerAction({ matches: /^(語言|language|语言)/i });