import { ModelStatic } from 'sequelize/types';
import { Context } from './util';
import axios from 'axios';
import logger from 'winston';


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
    // callbackUrl
  };

  const response = await makeRequest(ctx, 'POST', 'room', body);
  logger.debug(response);
}


export async function handleStatusUpdate(ctx: Context, body: any) {
  logger.debug('Status update', body);
}
