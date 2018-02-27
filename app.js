/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var express = require("express");
var app = express();
var port = process.env.PORT || 3978;
var http = require("http");
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

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

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, function (session) {
    session.beginDialog('language');
}).set('storage', inMemoryStorage); // Register in-memory storage

bot.dialog('isRepair', [
    function (session, args) {
        console.log("-----isRepair part-----");
        session.dialogData.language = args.intent.matched[0].input;
        session.send("歡迎光臨大同世界科技０８００報修系統，您可以在這裡取得大同世界科技客服中心的服務");
        builder.Prompts.choice(session, "請問您是要進行故障報修嗎?", "yes|no", { listStyle: 3 });
    },
    function (session, results) {
        if (results.response.entity == "yes") {
            session.dialogData.isRepair = "yes";
            builder.Prompts.number(session, "請輸入您的統一編號");
        }
        else {
            session.send("謝謝您的光臨，願您一切順心，再見！");
            session.endDialogWithResult({
                response: { isRepair: results.response.entity }
            });
        }
    },
    function (session, results) {
        session.dialogData.customerNo = results.response;
        session.send(`您輸入的是: ${session.dialogData.customerNo}`)
        builder.Prompts.text(session, "請輸入您電話號碼");
    },
    function (session, results) {
        session.dialogData.phone = results.response;
        session.send(`您輸入的是: ${session.dialogData.phone} <br/> 謝謝您的光臨，願您一切順心，再見！`)
        session.endDialogWithResult({
            response: { language: session.dialogData.language, isRepair: session.dialogData.isRepair, phone: session.dialogData.phone, customerNo: session.dialogData.customerNo }
        });
    }
]).triggerAction({ matches: /^(中文|English|简中)/i });;

// Add dialog to return list of shirts available
bot.dialog('language', function (session) {
    console.log("-----language part-----");
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
            .title("請選擇您要使用的語言")
            .text("What's your preferred language?")
            .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
            .buttons([
                builder.CardAction.imBack(session, "中文", "中文 (1)"),
                builder.CardAction.imBack(session, "English", "English (1)"),
                builder.CardAction.imBack(session, "简中", "簡中 (1)")
            ])
    ]);
    session.send(msg).endDialog();
}).triggerAction({ matches: /^(語言|language|语言)/i });

bot.dialog('catchData', function (session, data) {
    console.log("-----catchData part-----");
    console.log(data);
    session.endDialog();
}).triggerAction({ matches: /(謝謝您的光臨，願您一切順心，再見！)/i });