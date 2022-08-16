import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Context } from '../util';
import { generateMultiple } from 'generate-password';


const PW_MODAL_ID = 'passwordModal';


export default async function roomCreationRequestResolutionResponse(ctx: Context, interaction: any) {
  const channelId = BigInt(interaction.channelId);
  const userId = BigInt(interaction.member.user.id);

  const roomCreationRequest = await ctx.db.RoomCreationRequest.findOne({
    where: {
      channelId: channelId,
      userId: userId
    }
  });
  roomCreationRequest.resolution = interaction.values[0];
  await roomCreationRequest.save();

  const modal = new ModalBuilder()
    .setCustomId(PW_MODAL_ID)
    .setTitle('Room and Admin Password');

  const [ autoPw, autoAdminPw ] = generateMultiple(2, { length: 12, numbers: true });

  const pwRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
    .addComponents(
      new TextInputBuilder()
        .setCustomId('pwTextInput')
        .setLabel('Room password')
        .setStyle(TextInputStyle.Short)
        .setValue(autoPw)
    );
  const adminPwRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
    .addComponents(
      new TextInputBuilder()
        .setCustomId('adminPwTextInput')
        .setLabel('Admin password')
        .setStyle(TextInputStyle.Short)
        .setValue(autoAdminPw)
    );
    
  modal.addComponents(pwRow, adminPwRow);
  await interaction.showModal(modal);
}
