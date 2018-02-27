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
        session.endDialogWithResult({
            response: { language: results.response.entity }
        });
    }
]);

bot.dialog('isRepair', [
    function (session) {
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
            response: { isRepair: session.dialogData.isRepair, phone: session.dialogData.phone, customerNo: session.dialogData.customerNo }
        });
    }
]);

bot.dialog('showShirts', [function (session) {
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
            .title("請選擇您要使用的語言")
            .text("What's your preferred language?")
            .images([builder.CardImage.create(session, 'https://www.google.com.tw/imgres?imgurl=https%3A%2F%2Ffthmb.tqn.com%2FDFWbLgCSeZOjiZ1d_XAWQG_b6LY%3D%2F768x0%2Ffilters%3Ano_upscale()%2Fhello-in-eight-different-languages-185250085-5941fb8c3df78c537b32ecac.jpg&imgrefurl=https%3A%2F%2Fwww.lifewire.com%2Fchange-facebook-language-to-english-2654383&docid=afTvWRj88TJuYM&tbnid=EbzZsBYIQ5ucnM%3A&vet=10ahUKEwj25sy098TZAhWJvrwKHepvDScQMwgnKAIwAg..i&w=768&h=269&safe=strict&bih=954&biw=958&q=language&ved=0ahUKEwj25sy098TZAhWJvrwKHepvDScQMwgnKAIwAg&iact=mrc&uact=8')])
            .buttons([
                builder.CardAction.imBack(session, "中文", "中文 (1)"),
                builder.CardAction.imBack(session, "英文", "英文 (1)"),
                builder.CardAction.imBack(session, "簡中", "簡中 (1)")
            ]),
        new builder.HeroCard(session)
            .title("Classic Gray T-Shirt")
            .subtitle("100% Soft and Luxurious Cotton")
            .text("Price is $25 and carried in sizes (S, M, L, and XL)")
            .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/grayshirt.png')])
            .buttons([
                builder.CardAction.imBack(session, "buy classic gray t-shirt", "Buy")
            ])
    ]);
    session.send(msg);
},
function (session, results) {
    console.log(results);
    session.endDialog();
}]).triggerAction({ matches: /^(show|list)/i });