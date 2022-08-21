import {
  ActionRowBuilder,
  SelectMenuBuilder,
  SlashCommandBuilder
} from 'discord.js';
import { Context } from '../util';
import logger from 'winston';
import { CommandHandler } from '../util';


export const SELECT_IMAGE_ID = 'imageSelect';


module.exports = {
  build: (ctx: Context): CommandHandler => {
    return {
      data: new SlashCommandBuilder()
        .setName('newroom')
        .setDescription('Choose an image'),

      execute: async (interaction: any) => {

        await ctx.db.RoomCreationRequest.create({
          channelId: BigInt(interaction.channelId),
          userId: BigInt(interaction.member.user.id)
        });

        const row = new ActionRowBuilder()
          .addComponents(
            new SelectMenuBuilder()
              .setCustomId(SELECT_IMAGE_ID)
              .setPlaceholder('Room image')
              .addOptions(
                {
                  label: 'Chrome',
                  value: 'google-chrome'
                },
                {
                  label: 'Firefox',
                  value: 'firefox'
                },
                {
                  label: 'Brave',
                  value: 'brave'
                },
                {
                  label: 'Chromium',
                  value: 'chromium'
                },
                {
                  label: 'Microsoft Edge',
                  value: 'microsoft-edge'
                },
                {
                  label: 'Tor Browser',
                  value: 'tor-browser'
                },
                {
                  label: 'Remmina',
                  value: 'remmina'
                },
                {
                  label: 'Ungoogled Chromium',
                  value: 'ungoogled-chromium'
                },
                {
                  label: 'Vivaldi',
                  value: 'vivaldi'
                },
                {
                  label: 'VLC',
                  value: 'vlc'
                },
                {
                  label: 'VNC Viewer',
                  value: 'vncviewer'
                },
                {
                  label: 'XFCE',
                  value: 'xfce'
                },
              )
          );

        const reply = await interaction.reply({ content: 'Room options:', components: [row] });
        logger.debug('New room reply', reply);
      }
    }
  }
}
