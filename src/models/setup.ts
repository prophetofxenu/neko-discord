import { Sequelize } from 'sequelize';
import roomCreationRequest from './room-creation-request';
import room from './room';


function setupDb(sequelize: Sequelize) {
  const _roomCreationRequest = roomCreationRequest(sequelize);
  const _room = room(sequelize);

  _roomCreationRequest.hasOne(_room);
  _room.belongsTo(_roomCreationRequest);

  return {
    Room: _room,
    RoomCreationRequest: _roomCreationRequest
  }
}
export default setupDb;
