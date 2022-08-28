import { Context } from './util';
import axios from 'axios';
import logger from 'winston';
import { EmbedBuilder, TextChannel } from 'discord.js';


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
  return response;
}


export async function login(ctx: Context) {
  const body = {
    name: ctx.info.nekoDoUser,
    pw: ctx.info.nekoDoPw
  };
  const response = await makeRequest(ctx, 'POST', 'login', body);
  ctx.info.bearerToken = response.data.token;
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

  logger.info(`Room ${room.id} is being created`);
}


export async function deleteRoom(ctx: Context, room: any) {

  const url = `room/${room.dataValues.nekoDoId}`;
  const response = await makeRequest(ctx, 'DELETE', url, {});
  logger.debug('Received response from neko-do', response);

  logger.info(`Room ${room.dataValues.id} destroyed`);

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
  if (status !== 'ready') {
    logger.debug('Room not ready');
    return;
  }

  const name = body.name;
  const url = `https://${body.url}`;
  const image = body.image;
  const resolution = body.resolution;
  const fps = body.fps;
  const password = body.password;
  const expires = new Date(body.expires);
  const expireStr = `${expires.getHours()}:${expires.getMinutes()}`;

  const roomRequest = await ctx.db.RoomCreationRequest.findOne({
    where: {
      id: room.RoomCreationRequestId
    }
  });
  const channelId = roomRequest.channelId;
  const channel = await ctx.discordClient.channels.fetch(channelId.toString()) as TextChannel;
  await channel.send({
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
