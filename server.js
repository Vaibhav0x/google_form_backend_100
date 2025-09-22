const express = require("express");
const cors = require("cors");
const sequelize = require("./config/db");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const formRoutes = require("./routes/formRoutes");
const responseRoutes = require("./routes/responseRoutes");

require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/forms", responseRoutes);

sequelize
    .sync({ alter: true }) // This will update the existing tables
    .then(() => {
        console.log("Database connected and tables updated");
        app.listen(process.env.PORT, () =>
            console.log(`Server running on http://localhost:${process.env.PORT}`)
        );
    })
    .catch((err) => console.error("DB connection error:", err));
