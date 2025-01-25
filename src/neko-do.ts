import { Context } from './util';
import axios from 'axios';
import logger from 'winston';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import {
  makeInteractionId,
  EXTEND_BUTTON_ID
} from './interactions';
import strftime from 'strftime';


async function makeRequest(ctx: Context, method: string, route: string, body: any) {
  const headers: any = {};
  if (ctx.info.bearerToken) {
    headers['Authorization'] = `Bearer ${ctx.info.bearerToken}`;
  }
  const response = await axios.request({
    method: method,
    url: `${ctx.info.nekoDoUrl}/${route}`,
    data: body,
    headers: headers
  });
  logger.debug('neko-do response', response);
  return response;
}


export async function login(ctx: Context) {
  const body = {
    name: ctx.info.nekoDoUser,
    pw: ctx.info.nekoDoPw
  };
  const response = await makeRequest(ctx, 'POST', 'login', body);
  ctx.info.bearerToken = response.data.token;
  logger.info('Logged into neko-do');
}


export async function submitRoomRequest(ctx: Context, request: any) {

  const resolutionMatch = request.resolution.match(/^(\d+)p(\d+)$/);
  const resolution = resolutionMatch[1];
  const fps = parseInt(resolutionMatch[2]);

  const body = {
    password: request.password,
    adminPassword: request.admin_password,
    image: request.image,
    resolution: resolution,
    fps: fps,
    callbackUrl: `${ctx.info.hostUrl}/status`
  };

  const response = await makeRequest(ctx, 'POST', 'room', body);
  logger.debug('Received response from neko-do', response);
  const nekoDoId = response.data.room.id;
  const url = response.data.room.url;

  request.submitted = true;
  await request.save();
  logger.debug(`Updated request ${request.id}`);
  const room = await ctx.db.Room.create({
    nekoDoId: nekoDoId,
    url: url,
    RoomCreationRequestId: request.id
  });
  await room.save();
  logger.debug(`Created room ${room.id}`);

  logger.info(`Room ${room.id} request submitted`);
}


export async function extendRoom(ctx: Context, roomId: number) {

  const room = await ctx.db.Room.findByPk(roomId);
  if (!room) {
    logger.error(`Attempted to renew room ${roomId} but it doesn't exist`);
    return;
  }
  const url = `room/${room.nekoDoId}`;
  const response = await makeRequest(ctx, 'PUT', url, {}) as any;
  logger.debug('Received response from neko-do', response);
  room.expires = response.data.room.expires;
  await room.save();
  logger.info(`Renewed room ${room.id} (now expires at ${room.expires})`);
  await setRoomTimer(ctx, room.id);
  return room;

}


export async function deleteRoom(ctx: Context, room: any) {

  const url = `room/${room.dataValues.nekoDoId}`;
  const response = await makeRequest(ctx, 'DELETE', url, {});
  logger.debug('Received response from neko-do', response);

  if (ctx.roomTimers.has(room.id)) {
    clearTimeout(ctx.roomTimers.get(room.id));
    ctx.roomTimers.delete(room.id);
  }

}


async function setRoomTimer(ctx: Context, roomId: number) {

  const func = async () => {
    logger.info(`Alerting user that room ${roomId} is about to expire`);
    const room = await ctx.db.Room.findByPk(roomId);
    const roomRequest = await ctx.db.RoomCreationRequest.findByPk(room.RoomCreationRequestId);
    const channel = await ctx.discordClient.channels.fetch(roomRequest.channelId) as TextChannel;
    if (!channel) {
      logger.error(`Channel ${roomRequest.channelId} was not found`);
      return;
    }
    const user = await ctx.discordClient.users.fetch(roomRequest.userId);
    if (!user) {
      logger.error(`User ${roomRequest.userId} was not found`);
      return;
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(makeInteractionId(EXTEND_BUTTON_ID, room.id))
          .setLabel('+1 Hour')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({
      content: `${user} Your room is about to expire!`,
      components: [row as any]
    });
    ctx.roomTimers.delete(room.id);
  };

  const room = await ctx.db.Room.findByPk(roomId);
  const delay = room.expires - 1000 * 60 * 5 - new Date().getTime();
  if (delay > 5000) {
    ctx.roomTimers.set(roomId, setTimeout(func, delay));
    logger.info(`Set room timer for ${roomId} in ${delay / 1000} seconds`);
  }
}


export async function loadRoomTimers(ctx: Context) {
  logger.info('Loading room timers');
  const rooms = await ctx.db.Room.findAll({
    where: {
      status: 'ready'
    }
  });
  for (const room of rooms) {
    await setRoomTimer(ctx, room.id);
  }
}


export async function handleStatusUpdate(ctx: Context, body: any) {
  logger.debug('Status update', body);
  const nekoDoId = body.id;
  const status = body.status;
  const room = await ctx.db.Room.findOne({
    where: {
      nekoDoId: nekoDoId
    }
  });
  logger.debug('Retrieved room', room);
  room.status = status;
  await room.save();
  logger.info(`Room ${room.id} status updated to ${status}`);

  switch (status) {
  case 'ready':
    await handleStatusReady(ctx, body, room);
    break;
  case 'destroyed':
    await handleStatusDestroyed(ctx, room);
    break;
  case 'failed':
    await handleStatusFailed(ctx, room);
    break;
  }

}


async function handleStatusReady(ctx: Context, body: any, room: any) {
  const name = body.name;
  const url = `https://${body.url}`;
  const image = body.image;
  const resolution = body.resolution;
  const fps = body.fps;
  const password = body.password;
  const expires = new Date(body.expires);
  const expireStr = strftime('%b %d, %l:%M %p', expires);

  room.expires = expires;
  await room.save();
  setRoomTimer(ctx, room.id);

  const roomRequest = await ctx.db.RoomCreationRequest.findByPk(room.RoomCreationRequestId);
  const channelId = roomRequest.channelId;
  const channel = await ctx.discordClient.channels.fetch(channelId.toString()) as TextChannel;
  const user = await ctx.discordClient.users.fetch(roomRequest.userId);
  await channel.send({
    content: `${user}`,
    embeds: [
      new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${name} is ready!`)
        .setURL(url)
        .setDescription('Click above link to open room in browser.')
        .addFields(
          { name: 'Image', value: image, inline: true },
          { name: 'Resolution', value: `${resolution}p@${fps}`, inline: true },
          { name: 'Expires', value: expireStr, inline: true },
          { name: 'Password', value: password }
        )
        .setTimestamp()
    ]
  });
  logger.info(`Room ${room.id} marked as ready in Discord`);
}


async function handleStatusDestroyed(ctx: Context, room: any) {
  const roomRequest = await ctx.db.RoomCreationRequest.findByPk(room.RoomCreationRequestId);
  const channel = await ctx.discordClient.channels.fetch(roomRequest.channelId) as TextChannel;
  if (!channel) {
    logger.error(`Channel ${roomRequest.channelId} no longer exists`);
    return;
  }
  const user = await ctx.discordClient.users.fetch(roomRequest.userId);
  if (!user) {
    logger.error(`User ${roomRequest.userId} no longer exists`);
  }
  logger.info(`Room ${room.id} deleted`);
  // if this was from a command, make sure the response has time to make it first
  setTimeout(async () => {
    await channel.send(`${user} Your room has been deleted, thanks for watching 🐱`);
  }, 1500);
}

async function handleStatusFailed(ctx: Context, room: any) {
  const roomRequest = await ctx.db.RoomCreationRequest.findByPk(room.RoomCreationRequestId);
  const channel = await ctx.discordClient.channels.fetch(roomRequest.channelId) as TextChannel;
  if (!channel) {
    logger.error(`Channel ${roomRequest.channelId} no longer exists`);
    return;
  }
  const user = await ctx.discordClient.users.fetch(roomRequest.userId);
  if (!user) {
    logger.error(`User ${roomRequest.userId} no longer exists`);
  }
  logger.info(`Room ${room.id} failed`);
  await channel.send(`${user} Your room failed to create. Please try again. If this has happened multiple times in a row, please contact an admin.`);
}
