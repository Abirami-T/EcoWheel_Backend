const express = require("express");
const router = express.Router();
const axios = require('axios');
const nodemailer = require("nodemailer");
const Document = require("../models/document");
const User = require("../models/signupSchema");
const Communication = require("../models/communication");
const {
    extractRCBookData,
    generateSolutionText,
  } = require("../middleware/gptModel");
// Assuming dragonFly is your trained model's prediction function imported correctly
const { dragonFly } = require('../middleware/trainmodel.js');

async function fetchAverageCOEmission() {
  try {
    const response = await axios.get('https://api.thingspeak.com/channels/2409021/feeds.json?results=10');
    let totalEmission = 0;
    response.data.feeds.forEach(feed => {
      totalEmission += parseFloat(feed.field1); // Assuming the CO emission value is in field1
    });
    return totalEmission / response.data.feeds.length;
  } catch (error) {
    console.error("Failed to fetch CO emission data:", error);
    return null;
  }
}

async function vehicleConditionPrediction(engineSize, kilometersRan, litresConsumed, fuelType, cylinder,documentValue) {
  const averageCOEmission = await fetchAverageCOEmission();
  if (averageCOEmission === null) {
    console.error('Failed to fetch CO emission data');
    return -1; // Indicate an error
  }
 

  // Placeholder for actual calculation, you will need to adjust this according to your model's requirements
  const Fuel_city = litresConsumed / kilometersRan * 100; // Example calculation
  const Fuel_hwy = Fuel_city + 1; // Placeholder calculations
  const Fuel_comb = Fuel_hwy + 1;
  const Fuel_comb_mpg = Fuel_comb * 2.5;

  // Assuming dragonFly is your model's prediction function
  // Update the arguments as per your model's input requirements
  const Predict = dragonFly(engineSize, fuelType, cylinder, Fuel_city, Fuel_hwy, Fuel_comb, Fuel_comb_mpg, averageCOEmission);
  console.log("enginesize : ",engineSize);
  console.log("fuel type : ",fuelType);
  console.log("cylinder : ",cylinder);
  console.log("fuel city : ",Fuel_city);
  console.log("fuel hwy : ",Fuel_hwy);
  console.log("fuel comb : ",Fuel_comb);
  console.log("fuel comb(mpg) :",Fuel_comb_mpg);
  console.log("prediction status : ",Predict.status);
  if(Predict.status==1){
    const rcBookData = await extractRCBookData(
        documentValue.rcbook.frontText,
        documentValue.rcbook.backText
      );
      coValue=averageCOEmission;
  const solutionText = await generateSolutionText(rcBookData, coValue);

  const subject = "High CO Emission Alert";
  const text = `Carbon emitted highly. CO value: ${coValue}.\n\n${solutionText}`;

  await sendEmail(userId, subject, text, coValue, solutionText);
}
  return Predict.status;

}
let userId="";
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
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

// POST endpoint to predict vehicle condition based on carbon emission
router.post('/predict-condition', async(req, res) => {
  const { engineSize, kilometersRan, litresConsumed } = req.body;

  if (!engineSize || !kilometersRan || !litresConsumed) {
    return res.status(400).json({ message: 'Please fill all the fields!' });
  }

  const documentValue = await Document.findOne().sort({ createdAt: -1 });
  userId = documentValue.userId;

  if (!documentValue) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const fuel_Type = documentValue.rcbook.fuel_type;
  const cylinder = documentValue.rcbook.no_of_cylinder;
  const fuelType= fuel_Type === "PETROL" ? "Z" : "X";


  const prediction = await vehicleConditionPrediction(engineSize, kilometersRan, litresConsumed, fuelType, cylinder,documentValue);

  if (prediction === -1) {
    return res.status(500).json({ message: 'Error in prediction' });
  }

  res.json({ status: prediction });
});

module.exports = router;
