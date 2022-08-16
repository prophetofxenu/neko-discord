import { ActionRowBuilder, SelectMenuBuilder } from "discord.js";
import logger from 'winston';
import { Context } from "../util";


export const SELECT_RESOLUTION_ID = 'resolutionSelect';


export default async function roomCreationRequestImageResposne(ctx: Context, interaction: any) {
  const channelId = BigInt(interaction.channelId);
  const userId = BigInt(interaction.member.user.id);

  const roomCreationRequest = await ctx.db.RoomCreationRequest.findOne({
    where: {
      channelId: channelId,
      userId: userId
    }
  });
  const image = interaction.values[0];
  roomCreationRequest.image = image;
  await roomCreationRequest.save();

  const row = new ActionRowBuilder()
    .addComponents(
      new SelectMenuBuilder()
        .setCustomId(SELECT_RESOLUTION_ID)
        .setPlaceholder('Resolution')
        .addOptions(
          {
            label: '720p, 30FPS',
            value: '720p30'
          },
          {
            label: '720p, 60FPS',
            value: '720p60'
          },
          {
            label: '1080p, 30FPS',
            value: '1080p30'
          },
          {
            label: '1080p, 60FPS',
            value: '1080p60'
          }
        )
    );
  
  await interaction.update({ content: 'Select a resolution and framerate', components: [row] });
}
