'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class poll_question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  poll_question.init({
    fk_user_id: DataTypes.UUID,
    question_text: DataTypes.TEXT,
    maximum_time: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'poll_question',
  });
  return poll_question;
};
