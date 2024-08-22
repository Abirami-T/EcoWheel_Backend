const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/signupSchema");
const bcrypt = require("bcryptjs");

router.get("/profile", async (req, res) => {
  const { token } = req.headers;
  const mysecretkey = process.env.JWT_SECRET;

  let userInfo;

  if (token) {
    const decoded = jwt.verify(token, mysecretkey);
    userInfo = await User.findById(decoded.userId);
    userInfo.password = null;
  } else {
    userInfo = null;
  }

  if (userInfo) {
    return res.status(200).json(userInfo);
  }
});

router.patch("/update-profile", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.userId);
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          status: "Failed",
          message: "Email already exists",
        });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid Password" });
      }

      const newUser = await User.findByIdAndUpdate(
        decoded.userId,
        { email, name },
        { new: true }
      );

      return res.json({ email: newUser.email, name: newUser.name });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Authorization header is missing" });
    }
  } catch (error) {
    console.error("Error Updating Email:", error);
    res.status(500).json({ message: "Error Updating Email" });
  }
});

module.exports = router;
