const express = require("express");
const app = express();
require("dotenv").config();

const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Document = require("../models/document");
const User = require("../models/signupSchema");

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to send email notifications
const sendNotification = async (userId, documentName, expirationDate) => {
  // Find user by ID
  const user = await User.findById(userId);
  if (!user) {
    console.error("User not found for ID:", userId);
    return;
  }
  const userEmail = user.email;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Document Expiration Notification",
    text: `Your ${documentName} is expiring on ${expirationDate}. Please renew it.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending mail:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

// Schedule daily cron job to check for expiring documents
cron.schedule("0 0 * * *", async () => {
  console.log("check for expiring documents...");
  const currentDate = new Date();
  const thirtyDaysAhead = new Date(currentDate);
  thirtyDaysAhead.setDate(currentDate.getDate() + 30); // Set date 30 days ahead

  const fifteenDaysAhead = new Date(currentDate);
  fifteenDaysAhead.setDate(currentDate.getDate() + 15); // Set date 15 days ahead

  try {
    const documents = await Document.find({}); // Fetch all documents

    documents.forEach(async (doc) => {
      const userId = doc.userId;
      const licenseExpirationDate = new Date(doc.license.valid_date);
      const insuranceExpirationDate = new Date(doc.insurance.end_date);
      const rcBookExpirationDate = new Date(doc.rcbook.valid_date);

      // Check for license expiration
      if (
        licenseExpirationDate <= thirtyDaysAhead &&
        licenseExpirationDate > currentDate
      ) {
        sendNotification(userId, "License", doc.license.valid_date);
      }

      // Check for insurance expiration
      if (
        insuranceExpirationDate <= thirtyDaysAhead &&
        insuranceExpirationDate > currentDate
      ) {
        sendNotification(userId, "Insurance", doc.insurance.end_date);
      }

      // Check for RC book expiration
      if (
        rcBookExpirationDate <= thirtyDaysAhead &&
        rcBookExpirationDate > currentDate
      ) {
        sendNotification(userId, "RC Book", doc.rcbook.valid_date);
      }
    });
  } catch (err) {
    console.error("Error fetching documents:", err);
  }
});

module.exports = sendNotification;
