const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Question = sequelize.define("Question", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    question_type: {
        type: DataTypes.ENUM("text", "textarea", "radio", "checkbox", "dropdown", "file", "image", "image_choice", "image_hotspot", "image_upload"),
        allowNull: false
    },
    options: { type: DataTypes.JSON, allowNull: true },
    required: { type: DataTypes.BOOLEAN, defaultValue: true },
    image_only: { type: DataTypes.BOOLEAN, defaultValue: false },
    max_images: { type: DataTypes.INTEGER, defaultValue: 1 },
    enable_checkboxes: { type: DataTypes.BOOLEAN, defaultValue: false },
    enable_multiple_choice: { type: DataTypes.BOOLEAN, defaultValue: false },
    multiple_choice_label: { type: DataTypes.STRING, allowNull: true },
    multiple_choice_options: { type: DataTypes.JSON, allowNull: true },
    image_url: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT, allowNull: true },
    max_images: { type: DataTypes.INTEGER, defaultValue: 1 },
    checkbox_options: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },
    choice_question: { type: DataTypes.STRING, allowNull: true },
    choice_options: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },
    annotations: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },
    image_options: {
        type: DataTypes.JSON,
        defaultValue: { checkboxes: [], multiple_choice: [] },
        allowNull: true
    },
    max_images: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
}, {
    tableName: "questions",
    timestamps: false,
});

module.exports = Question;
