import {
  ActionRowBuilder,
  CacheType,
  Interaction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { generateMultiple } from 'generate-password';
import logger from 'winston';
import { submitRoomRequest } from './neko-do';
import { Context } from './util';


const SELECT_RESOLUTION_ID = 'resolutionSelect';
const CREATE_RESOLUTION_SELECT = new ActionRowBuilder()
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

const PW_MODAL_ID = 'passwordModal';
function createPasswordModal(): ModalBuilder {
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
  return modal;
}


export default async function respondToNonCommand(ctx: Context, interaction: Interaction<CacheType>) {

  if (!interaction.isSelectMenu() && !interaction.isModalSubmit()) {
    logger.error('Unknown interaction type', interaction);
    return;
  }
  if (!interaction.channelId || !interaction.member?.user.id) {
    logger.error('Missing channel or user id', interaction);
    return;
  }

  const interactionId = interaction.customId;
  const channelId = BigInt(interaction.channelId);
  const userId = BigInt(interaction.member.user.id);
  const roomCreationRequest = await ctx.db.RoomCreationRequest.findOne({
    where: {
      channelId: channelId,
      userId: userId,
      submitted: false,
      valid: true
    }
  });

  if (interactionId === SELECT_RESOLUTION_ID && !roomCreationRequest.image ||
      interactionId === PW_MODAL_ID && !roomCreationRequest.resolution) {
    // eslint-disable-next-line no-extra-parens
    await (interaction as any).update({
      content: 'This request is stale, please run the /newroom command again or use your latest request.',
      components: []
    });
    return;
  }

  logger.debug(`Responding to request ${roomCreationRequest.id}`);

  if (interaction.isSelectMenu()) {

    if (interactionId === 'imageSelect') {
      const image = interaction.values[0];
      logger.debug(`Image selected: ${image}`);
      roomCreationRequest.image = image;
      await interaction.update({
        content: 'Select a resolution and framerate',
        components: [CREATE_RESOLUTION_SELECT as any]
      });
      logger.info(`Updated image on request ${roomCreationRequest.id}`);
    } else if (interactionId === SELECT_RESOLUTION_ID) {
      const resolution = interaction.values[0];
      logger.debug(`Resolution selected: ${resolution}`);
      roomCreationRequest.resolution = resolution;
      await interaction.showModal(createPasswordModal());
      logger.info(`Updated resolution on request ${roomCreationRequest.id}`)
    } else {
      logger.error(`Unknown select menu id "${interactionId}"`);
      return;
    }

    await roomCreationRequest.save();

  } else if (interaction.isModalSubmit()) {

    if (interactionId === PW_MODAL_ID) {

      const components = interaction.fields.components as any;
      roomCreationRequest.password = components[0].components[0].value;
      roomCreationRequest.admin_password = components[1].components[0].value;
      await roomCreationRequest.save();
      logger.info(`Updated passwords on request ${roomCreationRequest.id}`);

      // eslint-disable-next-line no-extra-parens
      await (interaction as any).update({
        content: 'Your request is being submitted! This will take 3-5 minutes.',
        components: []
      });

      await submitRoomRequest(ctx, roomCreationRequest);
    }

  } else {
    logger.error('Unknown interaction');
  }

}
