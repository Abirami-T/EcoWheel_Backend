const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/signupSchema.js");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const ObjectId = mongoose.Types.ObjectId;

const userId = new ObjectId();

router.use(express.json());

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "Failed",
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Generate a unique user ID
    const { v4: uuidv4 } = require("uuid");

    // Generate a unique user ID
    const userId = uuidv4();

    const newUser = new User({
      userId: userId,
      name,
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    const mysecretkey = process.env.JWT_SECRET;
    // Payload to generate JWT
    const payload = {
      userId: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
    };

    // Create a jsonwebtoken that expires in 5 days
    const token = jwt.sign(payload, mysecretkey, { expiresIn: "5d" });

    if (!savedUser) {
      return res
        .status(500)
        .json({ status: "Failed", message: "User cannot be created" });
    } else {
      return res.status(200).json({
        status: "Success",
        message: "User has been created in the database",
        token,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res
      .status(500)
      .json({ status: "Failed", message: "Internal Server Error" });
  }
});

module.exports = router;
