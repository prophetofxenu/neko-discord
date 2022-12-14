import { SlashCommandBuilder } from 'discord.js';
import { CommandHandler, Context } from '../util';
import logger from 'winston';
import { deleteRoom } from '../neko-do';

module.exports = {
  build: (ctx: Context): CommandHandler => {
    return {
      data: new SlashCommandBuilder()
        .setName('deleteroom')
        .setDescription('Delete your current room'),

      execute: async (interaction: any) => {

        logger.info(`Processing deletion request for ${interaction.user.username} in #${interaction.channel.name} (${interaction.guild.name})`);

        const channelId = BigInt(interaction.channelId);
        const userId = BigInt(interaction.member.user.id);

        const room = await ctx.db.Room.findOne({
          where: {
            status: 'ready',
          },
          include: {
            model: ctx.db.RoomCreationRequest,
            where: {
              channelId: channelId,
              userId: userId
            }
          }
        });
        if (!room) {
          logger.info('User has no rooms');
          await interaction.reply({ content: 'You don\'t have a room in use.'});
          return;
        }

        logger.info(`Deleting room ${room.dataValues.id}`);
        await deleteRoom(ctx, room);

        await interaction.reply({ content: 'Your room is being deleted...' });

      }
    }
  }
}
