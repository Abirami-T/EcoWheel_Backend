const express = require("express");
const cron = require("node-cron");
const axios = require("axios");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const app = express();
const Document = require("../models/document");
const User = require("../models/signupSchema");
const jwt = require("jsonwebtoken");
const {
  extractRCBookData,
  generateSolutionText,
} = require("../middleware/gptModel");
const Communication = require("../models/communication");
const router = express.Router();

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
let userId = "";
// Function to send email notification
const sendEmail = async (userId, subject, text, coValue, solutionText) => {
  try {
    // Define userMail based on userId
    let userMail = userId === "rto" ? "20it02@cit.edu.in" : null;
    if (userId !== "rto") {
      const user = await User.findById(userId);
      if (!user) {
        console.error("User not found");
        return;
      }
      userMail = user.email;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userMail,
      subject: subject,
      text: text,
    };

    transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", userMail);

    const communication = new Communication({
      userId,
      suggestion: solutionText,
      coValue,
    });

    await communication.save();
    console.log("Suggestion saved in communication collection");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

let isCheckActive = true; // Flag to control the check loop

// Schedule task to check CO levels and send notifications
cron.schedule("* * * * *", async () => {
  try {
    // const currentDate = '2024-03-01';
    let currentDate = new Date().toISOString().slice(0, 10);

    const response = await axios.get(
      "https://api.thingspeak.com/channels/2409021/feeds/last.json"
    );
    const coValue = response.data.field1; // Assuming CO value is in field1

    const lastEntryDate = response.data.created_at.slice(0, 10);
    const document = await Document.findOne().sort({ createdAt: -1 });
    userId = document?.userId;

    if (currentDate === lastEntryDate) {
      const threshold = 100;

      if (coValue > threshold && isCheckActive) {
        if (document.consecutiveDays === 0) {
          document.consecutiveDays = 1;
        } else {
          document.consecutiveDays += 1;
        }
        await document.save();

        if (document.consecutiveDays === 1 || document.consecutiveDays === 15) {
          const rcBookData = await extractRCBookData(
            document.rcbook.frontText,
            document.rcbook.backText
          );

          const solutionText = await generateSolutionText(rcBookData, coValue);

          const subject = "High CO Emission Alert";
          const text = `Carbon emitted highly. CO value: ${coValue}.\n\n${solutionText}`;

          await sendEmail(userId, subject, text, coValue, solutionText);
        }

        if (document.consecutiveDays === 25) {
          await sendEmail(
            userId,
            "Reminder: High CO Emission",
            `Reminder email after ${document.consecutiveDays} consecutive emission days, Information regarding your vehicle's emission mailed to RTO Office. They will visit your vehicle soon`,
            coValue
          );
          await sendEmail(
            "rto",
            "Warning: High CO Emission",
            "Warning email after 25 consecutive emission days",
            coValue
          );
        }
        // Stop further checking for the current day
        isCheckActive = false;
      } else {
        document.consecutiveDays = 0;

        // Resume checking on the next day
        if (currentDate !== lastEntryDate) {
          isCheckActive = true;
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

router.get("/communications", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Authorization header is missing" });
    }
    const communications = await Communication.find({ userId });

    res.json(communications);
  } catch (error) {
    console.error("Error fetching communications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/sendTestMail", async (req, res) => {
  try {
    const { userId, subject, coValue, text } = req.body;

    const document = await Document.findOne().sort({ updatedAt: -1 });

    const rcBookData = await extractRCBookData(
      document.rcbook.frontText,
      document.rcbook.backText
    );

    const solutionText = await generateSolutionText(rcBookData, coValue);

    sendEmail(userId, subject, text, coValue, solutionText);
    res.send("Mail Sent successfully & data stored in communications table");
  } catch (error) {
    console.error("Error Sending Mail", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
