import { Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import dotenv from 'dotenv';
import fs from 'fs';
import process from 'process';
import path from 'path';
import { CommandHandler } from './util';


dotenv.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Missing secrets in env');
  process.exit(1);
}


const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const command = require(filePath);
  commands.push(command.build().data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [] });
    console.log('Successfully cleared global commands');
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands })
    console.log('Successfully registered global commands');
  } catch (error) {
    console.error(error);
  }
})();
