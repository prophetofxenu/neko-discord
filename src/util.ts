import { SlashCommandBuilder } from 'discord.js';
import { ModelStatic } from 'sequelize/types';


export interface CommandHandler {
  data: SlashCommandBuilder,
  execute: (interaction: any) => Promise<void>
}


export interface Context {
  db: {
    RoomCreationRequest: ModelStatic<any>
  },
  info: {
    nekoDoUrl: string,
    nekoDoUser: string,
    nekoDoPw: string,
    hostUrl: string,
    bearerToken?: string
  }
}
