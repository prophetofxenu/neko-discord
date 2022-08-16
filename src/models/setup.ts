import { Sequelize } from 'sequelize';
import roomCreationRequest from './room-creation-request';


function setupDb(sequelize: Sequelize) {
  const _roomCreationRequest = roomCreationRequest(sequelize);

  return {
    RoomCreationRequest: _roomCreationRequest
  }
}
export default setupDb;
