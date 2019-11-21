// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } = require('botbuilder');

// This bot's main dialog.
const { DialogBot } = require('./bots/dialogBot');
const { UserProfileDialog } = require('./dialogs/userProfileDialog');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] erro não tratado: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
        );

        // Send a message to the user
        await context.sendActivity('O BOT encontrou um erro ou um bug.');
        await context.sendActivity('Para continuar a executar este BOT, por favor corrija seu código fonte.');

        // Limpando estado da conversa
        await this.ConversationState.delete(context);
    };

    // Armazenamento em memória (Apenas para testes e MVP1)
    const memoryStorage = new MemoryStorage();

    // Criando o estado da conversa com armazenamento em memória criado anteriormente
    const conversationState = new ConversationState(memoryStorage);
    const userState = new UserState(memoryStorage);

    // Create the main dialog.
    const dialog = new UserProfileDialog(userState);
    const bot = new DialogBot(conversationState, userState, dialog);

    // Create HTTP server
    const server = restify.createServer();
    server.listen(process.env.port || process.env.PORT || 3978, () => {
        console.log(`\n${ server.name } ouvindo em ${ server.url }`);
        console.log('\nInstale o Emulador: https://aka.ms/botframework-emulator');
        console.log('\nPara interagir com o bot, abra o emulador e clique em "Open Bot"');
    });

    // Listen for incoming requests.
    server.post('/api/messages', (req, res) => {
        adapter.processActivity(req, res, async (context) => {
            // Route to main dialog.
            await bot.run(context);
        });
    });
