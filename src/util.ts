import { Client, SlashCommandBuilder } from 'discord.js';
import { ModelStatic } from 'sequelize';


export interface CommandHandler {
  data: SlashCommandBuilder,
  execute: (interaction: any) => Promise<void>
}


export interface Context {
  discordClient: Client,
  db: {
    Room: ModelStatic<any>,
    RoomCreationRequest: ModelStatic<any>
  },
  roomTimers: Map<number, NodeJS.Timeout>,
  info: {
    nekoDoUrl: string,
    nekoDoUser: string,
    nekoDoPw: string,
    hostUrl: string,
    bearerToken?: string
  }
}
