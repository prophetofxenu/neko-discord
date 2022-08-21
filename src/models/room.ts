import { Sequelize, DataTypes } from 'sequelize';


function room(sequelize: Sequelize) {
  return sequelize.define('Room', {
    url: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.STRING
    },
    nekoDoId: {
      type: DataTypes.INTEGER
    }
  });
}
export default room;
