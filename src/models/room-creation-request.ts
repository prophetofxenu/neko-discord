import { Sequelize, DataTypes } from 'sequelize';


function roomCreationRequest(sequelize: Sequelize) {
  return sequelize.define('RoomCreationRequest', {
    channelId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING
    },
    resolution: {
      type: DataTypes.STRING
    },
    password: {
      type: DataTypes.STRING
    },
    admin_password: {
      type: DataTypes.STRING
    },
    submitted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    indexes: [
      {
        name: 'room_creation_request_channelId_userId',
        fields: [ 'channelId', 'userId' ]
      }
    ]
  });
}
export default roomCreationRequest;
