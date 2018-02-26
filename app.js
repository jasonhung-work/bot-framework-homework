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
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('language');
    },
    function (session, results) {
        if (results.response.language) {
            session.beginDialog('isRepair');
        }
        else {
            session.endDialog("謝謝您的光臨，願您一切順心，再見！");
        }
    },
    function (session, results) {
        console.log(results);
        session.endDialog();
    }
]).set('storage', inMemoryStorage); // Register in-memory storage

bot.dialog('language', [
    function (session) {
        session.send("請選擇您要使用的語言");
        builder.Prompts.choice(session, "What's your preferred language?", "中文|英文|簡中", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        console.log(results.response);
        if (results.response == "中文" || results.response == "英文" || results.response == "簡中") {
            session.endDialogWithResult({ 
                response: { language: results.response } 
            });
        }
        else {
            session.send("不好意思，我們還未提供此語言")
            session.endDialogWithResult({ 
                response: { language: false } 
            });
        }
    }
]);

bot.dialog('isRepair', [
    function (session) {
        session.send("歡迎光臨大同世界科技０８００報修系統，您可以在這裡取得大同世界科技客服中心的服務");
        builder.Prompts.confirm(session, "請問您是要進行故障報修嗎? 請輸入yes或no");
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.isRepair = results.response;
            builder.Prompts.number(session, "請輸入您的統一編號");
        }
        else {
            session.endDialog("謝謝您的光臨，願您一切順心，再見！");
        }
    },
    function (session, results) {
        session.dialogData.customerNo = results.response;
        session.send(`您輸入的是: ${session.dialogData.customerNo}`)
        builder.Prompts.number(session, "請輸入您電話號碼");
    },
    function (session, results) {
        session.dialogData.phone = results.response;
        console.log(session.dialogData);
        session.send(`您輸入的是: ${session.dialogData.phone} <br/> 謝謝您的光臨，願您一切順心，再見！`)
        session.endDialogWithResult({ 
            response: { phone: session.dialogData.phone, customerNo: session.dialogData.customerNo } 
        });
    }
]);