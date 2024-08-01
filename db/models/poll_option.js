'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class poll_option extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  poll_option.init({
    fk_poll_question_id: DataTypes.INTEGER,
    option_text: DataTypes.TEXT,
    is_correct: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'poll_option',
  });
  return poll_option;
};