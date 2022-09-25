import {
  ActionRowBuilder,
  ButtonInteraction,
  CacheType,
  Interaction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  SelectMenuBuilder,
  SelectMenuInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { generateMultiple } from 'generate-password';
import logger from 'winston';
import {
  extendRoom,
  submitRoomRequest
} from './neko-do';
import { Context } from './util';


export const EXTEND_BUTTON_ID = 'extend';


export function makeInteractionId(label: string, id: number): string {
  return `${label}_${id}`;
}


export function getInteractionId(idString: string): { interactionType: string, interactionId: number } {
  const match = idString.match(/^([^_]+)_(\d+)$/);
  if (!match) {
    throw `Invalid interaction id string: ${idString}`
  }
  return {
    interactionType: match[1],
    interactionId: Number(match[2])
  };
}


const SELECT_RESOLUTION_ID = 'resolutionSelect';
function createResolutionSelect(id: number): ActionRowBuilder {
  const select = new ActionRowBuilder()
    .addComponents(
      new SelectMenuBuilder()
        .setCustomId(makeInteractionId(SELECT_RESOLUTION_ID, id))
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
  return select;
}

const PW_MODAL_ID = 'passwordModal';
function createPasswordModal(id: number): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(makeInteractionId(PW_MODAL_ID, id))
    .setTitle('Set Room and Admin Passwords');

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


async function respondToRoomRequest(ctx: Context, interaction: SelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType>) {

  const { interactionType, interactionId } = getInteractionId(interaction.customId);
  const roomCreationRequest = await ctx.db.RoomCreationRequest.findByPk(interactionId);

  if (!roomCreationRequest) {
    // eslint-disable-next-line no-extra-parens
    await (interaction as any).update({
      content: 'This request is stale, please run the /newroom command again or use your latest request.',
      components: []
    });
    return;
  }

  logger.debug(`Responding to request ${roomCreationRequest.id}`);

  if (interaction.isSelectMenu()) {

    if (interactionType === 'imageSelect') {
      const image = interaction.values[0];
      logger.debug(`Image selected: ${image}`);
      roomCreationRequest.image = image;
      await interaction.update({
        content: 'Select a resolution and framerate',
        components: [createResolutionSelect(interactionId) as any]
      });
      logger.info(`Updated image on request ${roomCreationRequest.id}`);
    } else if (interactionType === SELECT_RESOLUTION_ID) {
      const resolution = interaction.values[0];
      logger.debug(`Resolution selected: ${resolution}`);
      roomCreationRequest.resolution = resolution;
      await interaction.showModal(createPasswordModal(interactionId));
      logger.info(`Updated resolution on request ${roomCreationRequest.id}`)
    } else {
      logger.error(`Unknown select menu id "${interactionId}"`);
      return;
    }

    await roomCreationRequest.save();

  } else if (interaction.isModalSubmit()) {

    if (interactionType === PW_MODAL_ID) {

      const components = interaction.fields.components as any;
      roomCreationRequest.password = components[0].components[0].value;
      roomCreationRequest.admin_password = components[1].components[0].value;
      await roomCreationRequest.save();
      logger.info(`Updated passwords on request ${roomCreationRequest.id}`);

      // eslint-disable-next-line no-extra-parens
      await (interaction as any).update({
        content: 'Your request is being created! This will take 3-5 minutes.',
        components: []
      });

      await submitRoomRequest(ctx, roomCreationRequest);
    }

  } else {
    logger.error('Unknown interaction');
  }

}


async function respondToRoom(ctx: Context, interaction: ButtonInteraction<CacheType>) {

  const { interactionType, interactionId } = getInteractionId(interaction.customId);

  const existingRoom = await ctx.db.RoomCreationRequest.findOne({
    where: {
      '$Room.id$': interactionId
    },
    include: [{
      model: ctx.db.Room,
      as: 'Room',
      required: true
    }],
  });
  const userId = existingRoom.userId;
  if (userId !== interaction.user.id) {
    await interaction.reply(`${interaction.user} This isn't for you 😠`);
    return;
  }

  if (interaction.isButton()) {
    if (interactionType === EXTEND_BUTTON_ID) {
      if (existingRoom.Room.status !== 'ready') {
        await interaction.update({
          content: 'This room has already expired. Please request a new one.',
          components: []
        });
      } else {
        await extendRoom(ctx, interactionId);
        await interaction.update({
          content: 'Your room has been extended by one hour.',
          components: []
        });
      }
    }
  }

}


export default async function respondToNonCommand(ctx: Context, interaction: Interaction<CacheType>) {

  if (!interaction.isSelectMenu() && !interaction.isModalSubmit() && !interaction.isButton()) {
    logger.error('Unknown interaction type', interaction);
    return;
  }
  if (!interaction.channelId || !interaction.member?.user.id) {
    logger.error('Missing channel or user id', interaction);
    return;
  }

  const { interactionType } = getInteractionId(interaction.customId);
  logger.info(`Processing interaction ${interactionType} for ${interaction.user.username} in #${(interaction.channel as TextChannel).name} (${interaction.guild?.name})`);

  if (interactionType === 'imageSelect' ||
      interactionType === SELECT_RESOLUTION_ID ||
      interactionType === PW_MODAL_ID) {
    await respondToRoomRequest(ctx, interaction as any);
  } else if (interactionType === EXTEND_BUTTON_ID) {
    await respondToRoom(ctx, interaction as any);
  } else {
    throw `Unknown interaction ${interaction}`;
  }

}
