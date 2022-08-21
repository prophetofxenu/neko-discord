import {
  Client,
  Collection,
  GatewayIntentBits,
} from 'discord.js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import process from 'process';
import { Sequelize } from 'sequelize';
import bodyParser from 'body-parser';
import express from 'express';
import logger from 'winston';

import {
  CommandHandler,
  Context
} from './util';
import setupDb from './models/setup';
import respondToNonCommand from './interactions';
import {
  handleStatusUpdate,
  login
} from './neko-do';


logger.add(new logger.transports.Console({ level: 'debug', format: logger.format.simple() }));


dotenv.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DB_USER = process.env.DB_USER || 'neko_herder_discord';
const DB_PW = process.env.DB_PW || 'password';
const DB_ADDR = process.env.DB_ADDR || '127.0.0.1';
const dbString = `postgres://${DB_USER}:${DB_PW}@${DB_ADDR}:5432/neko_herder_discord`;
const sequelize = new Sequelize(dbString, {
  logging: msg => logger.debug(msg)
});
sequelize.authenticate();
const db = setupDb(sequelize);

const NEKO_DO_URL = process.env.NEKO_DO_URL;
if (!NEKO_DO_URL) {
  logger.error('Missing NEKO_DO_URL in .env');
  process.exit(1);
}
const NEKO_DO_USER = process.env.NEKO_DO_USER || 'bot';
const NEKO_DO_PW = process.env.NEKO_DO_PW || 'botuser';
const HOST_URL = process.env.HOST_URL;
if (!HOST_URL) {
  logger.error('Missing HOST_URL in .env');
  process.exit(1);
}

const expServer = express();
const EXPRESS_PORT = process.env.EXPRESS_PORT || 8080;
expServer.use(bodyParser);

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
discordClient.once('ready', () => {
  logger.info('Discord client ready');
});

(async () => {
  await sequelize.sync({ alter: true });

  const ctx: Context = {
    db: db,
    info: {
      nekoDoUrl: NEKO_DO_URL,
      nekoDoUser: NEKO_DO_USER,
      nekoDoPw: NEKO_DO_PW,
      hostUrl: HOST_URL,
    }
  };

  await login(ctx);

  // load commands
  const commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command = require(path.join(commandsPath, file)).build(ctx);
    commands.set(command.data.name, command);
  }

  discordClient.on('interactionCreate', async (interaction) => {
    logger.debug('Interaction received', interaction);

    if (!interaction.isChatInputCommand()) {
      await respondToNonCommand(ctx, interaction);
      return;
    }

    logger.info('Command received');

    const command = commands.get(interaction.commandName) as CommandHandler;
    if (!command) return;

    try {
      logger.info(`Executing ${command.data.name}`);
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
    }
  });

  expServer.put('/status', async (req, res) => {
    res.status(200).send();
    await handleStatusUpdate(ctx, req.body);
  });

  expServer.listen(EXPRESS_PORT, () => {
    logger.info(`Express server running on port ${EXPRESS_PORT}`);
  });

  discordClient.login(DISCORD_TOKEN);
})();
