const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Answer = sequelize.define("Answer", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    response_id: { type: DataTypes.INTEGER, allowNull: false },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    answer_text: { type: DataTypes.TEXT },
    image_paths: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },
    image_responses: {
        type: DataTypes.JSON,
        defaultValue: {
            checkboxes: [], // Array of arrays of selected checkbox options for each image
            choices: [] // Array of selected choice option IDs for each image
        },
        allowNull: true
    },
    file_paths: { type: DataTypes.JSON, allowNull: true }, // Array of file paths
    selected_options: { type: DataTypes.JSON, allowNull: true }, // Checkbox selections for each file
    selected_choices: { type: DataTypes.JSON, allowNull: true }, // Multiple choice selection for each file
    image_urls: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },
    image_responses: {
        type: DataTypes.JSON,
        defaultValue: {
            checkboxes: [], // array of checkbox selections for each image
            multiple_choice: [] // array of multiple choice selections for each image
        },
        allowNull: true
    },
}, {
    tableName: "answers",
    timestamps: false,
});

module.exports = Answer;
