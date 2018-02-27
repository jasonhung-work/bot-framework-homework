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
                response: { isRepair: results.response.entity}
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

// Add dialog to return list of shirts available
bot.dialog('showShirts', function (session) {
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
            .title("Classic White T-Shirt")
            .subtitle("100% Soft and Luxurious Cotton")
            .text("Price is $25 and carried in sizes (S, M, L, and XL)")
            .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
            .buttons([
                builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
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
    session.send(msg).endDialog();
}).triggerAction({ matches: /^(show|list)/i });

bot.dialog('buyButtonClick', [
    function (session, args, next) {
        // Get color and optional size from users utterance
        var utterance = args.intent.matched[0];
        var color = /(white|gray)/i.exec(utterance);
        var size = /\b(Extra Large|Large|Medium|Small)\b/i.exec(utterance);
        if (color) {
            // Initialize cart item
            var item = session.dialogData.item = { 
                product: "classic " + color[0].toLowerCase() + " t-shirt",
                size: size ? size[0].toLowerCase() : null,
                price: 25.0,
                qty: 1
            };
            if (!item.size) {
                // Prompt for size
                builder.Prompts.choice(session, "What size would you like?", "Small|Medium|Large|Extra Large");
            } else {
                //Skip to next waterfall step
                next();
            }
        } else {
            // Invalid product
            session.send("I'm sorry... That product wasn't found.").endDialog();
        }   
    },
    function (session, results) {
        // Save size if prompted
        var item = session.dialogData.item;
        if (results.response) {
            item.size = results.response.entity.toLowerCase();
        }

        // Add to cart
        if (!session.userData.cart) {
            session.userData.cart = [];
        }
        session.userData.cart.push(item);

        // Send confirmation to users
        session.send("A '%(size)s %(product)s' has been added to your cart.", item).endDialog();
    }
]).triggerAction({ matches: /(buy|add)\s.*shirt/i });