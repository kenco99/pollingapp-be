'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class poll_submission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  poll_submission.init({
    fk_user_id: DataTypes.UUID,
    fk_poll_question_id: DataTypes.INTEGER,
    fk_poll_option_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'poll_submission',
  });
  return poll_submission;
};
