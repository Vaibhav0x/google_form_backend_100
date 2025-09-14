const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Form = sequelize.define("Form", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: "forms",
    timestamps: false,  // since we already have created_at in SQL
});

module.exports = Form;
