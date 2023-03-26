import {
  ActionRowBuilder,
  SelectMenuBuilder,
  SlashCommandBuilder
} from 'discord.js';
import { Context } from '../util';
import logger from 'winston';
import { CommandHandler } from '../util';
import { makeInteractionId } from '../interactions';
import { Op } from 'sequelize';


export const SELECT_IMAGE_ID = 'imageSelect';


module.exports = {
  build: (ctx: Context): CommandHandler => {
    return {
      data: new SlashCommandBuilder()
        .setName('newroom')
        .setDescription('Create a new neko room'),

      execute: async (interaction: any) => {

        logger.info(`Processing room request for ${interaction.user.username} in #${interaction.channel.name} (${interaction.guild.name})`);

        const channelId = BigInt(interaction.channelId);
        const userId = BigInt(interaction.member.user.id);

        const currentRoom = await ctx.db.RoomCreationRequest.findAll({
          where: {
            channelId: channelId,
            userId: userId,
            '$Room.status$': {
              [Op.or]: {
                [Op.ne]: 'destroyed',
                [Op.is]: null
              }
            }
          },
          include: [{
            model: ctx.db.Room,
            as: 'Room',
            required: true
          }]
        });
        if (currentRoom.length > 0) {
          await interaction.reply('You already have an active room. Please delete that one before creating another.');
          return;
        }

        const currentRequests = await ctx.db.RoomCreationRequest.findAll({
          where: {
            channelId: channelId,
            userId: userId,
            submitted: false,
          }
        });
        if (currentRequests.length > 0) {
          logger.info(`User ${userId} already has an ongoing request`);
          await ctx.db.RoomCreationRequest.destroy({
            where: { id: currentRequests[0].id }
          });
          logger.debug(`Request ${currentRequests[0]} deleted`);
        }

        const request = await ctx.db.RoomCreationRequest.create({
          channelId: BigInt(interaction.channelId),
          userId: BigInt(interaction.member.user.id),
          interactionId: BigInt(interaction.id)
        });

        const row = new ActionRowBuilder()
          .addComponents(
            new SelectMenuBuilder()
              .setCustomId(makeInteractionId(SELECT_IMAGE_ID, request.id))
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
                  label: 'KDE',
                  value: 'kde'
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
