const express = require("express");
const cors = require("cors");
const sequelize = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const formRoutes = require("./routes/formRoutes");

require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);

sequelize
    .sync({ alter: true }) // This will update the existing tables
    .then(() => {
        console.log("Database connected and tables updated");
        app.listen(process.env.PORT, () =>
            console.log(`Server running on http://localhost:${process.env.PORT}`)
        );
    })
    .catch((err) => console.error("DB connection error:", err));
