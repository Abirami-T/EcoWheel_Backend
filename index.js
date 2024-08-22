const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const user = require("./controller/signup");
const loginapi = require("./controller/login");

const cloudinary = require("./config/cloudinary").v2;
const multer = require("multer");
const { recognizeTextFromImages } = require("./middleware/tesseract");
const expireMail = require("./controller/sendExpireMail");
const communication = require("./controller/emissionAlert");
const document = require("./controller/uploadRoutes");
const profile = require("./controller/profile");
const checkCondition=require("./controller/vehicleConditionModel");
const app = express();
app.use(cors());

app.use(express.json());

// Middleware to serve static files from the 'public' directory
app.use(express.static("public"));

app.use("/", user);
app.use("/", loginapi);
app.use("/", communication);
app.use("/", document);
app.use("/", profile);
app.use("/", checkCondition);
// app.use(bodyParser.json());

app.get("/home", (req, res) => {
  res.status(200).json("You are welcome");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Connect to MongoDB
mongoose.connect(process.env.MYDB_CONNECTION);

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Start the server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
