const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Response = sequelize.define("Response", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: "responses",
    timestamps: false,
});

module.exports = Response;
