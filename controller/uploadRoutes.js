const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/multer");
const Image = require("../models/Image");
const Document = require("../models/document");
const {
  extractRCBookData,
  extractLicenceData,
  extractInsuranceData,
} = require("../middleware/gptModel");
const {
  recognizeRCBookText,
  recognizeTextFromImage,
} = require("../middleware/tesseract");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

let userId = "";

router.post(
  "/upload",
  upload.fields([
    { name: "rcbookfrontImage", maxCount: 1 },
    { name: "rcbookbackImage", maxCount: 1 },
    { name: "licencefrontImage", maxCount: 1 },
    { name: "licencebackImage", maxCount: 1 },
    { name: "insurancefrontImage", maxCount: 1 },
  ]),
  async (req, res) => {
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

      const results = await Promise.all([
        cloudinary.uploader.upload(req.files["rcbookfrontImage"][0].path),
        req.files["rcbookbackImage"]
          ? cloudinary.uploader.upload(req.files["rcbookbackImage"][0].path)
          : null,
        cloudinary.uploader.upload(req.files["licencefrontImage"][0].path),
        req.files["licencebackImage"]
          ? cloudinary.uploader.upload(req.files["licencebackImage"][0].path)
          : null,
        cloudinary.uploader.upload(req.files["insurancefrontImage"][0].path),
      ]);

      const imageURLs = results.map((result) =>
        result ? result.secure_url : null
      );

      const imageConditions = {
        userId: userId,
      };

      const imageUpdates = {
        userId: userId,
        rcbookfrontImageURL: imageURLs[0],
        rcbookbackImageURL: imageURLs[1],
        licencefrontImageURL: imageURLs[2],
        licencebackImageURL: imageURLs[3],
        insurancefrontImageURL: imageURLs[4],

        cloudinaryId: results[0]?.public_id,
      };

      const imageOptions = { new: true, upsert: true };

      const image = await Image.findOneAndUpdate(
        imageConditions,
        imageUpdates,
        imageOptions
      );

      // Recognize text from images
      const rcbookText = await recognizeRCBookText(imageURLs[0], imageURLs[1]);
      const licenceText = await recognizeTextFromImage(imageURLs[2]);
      const insuranceText = await recognizeTextFromImage(imageURLs[4]);

      // Extract data using GPT-3.5 Turbo
      const rcbookData = await extractRCBookData(
        rcbookText.frontText,
        rcbookText.backText
      );
      const licenceData = await extractLicenceData(licenceText);
      const insuranceData = await extractInsuranceData(insuranceText);

      await saveDataToMongoDB(rcbookData, licenceData, insuranceData, userId);

      res.status(200).json({
        success: true,
        message: "Images uploaded and URLs saved successfully",
        data: {
          image,
          rcbookData,
          licenceData,
          insuranceData,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Error uploading images",
      });
    }
  }
);

async function saveDataToMongoDB(
  rcbookData,
  licenceData,
  insuranceData,
  userId
) {
  try {
    const documentConditions = { userId: userId };
    const documentUpdates = {
      userId: userId,
      rcbook: JSON.parse(rcbookData),
      license: JSON.parse(licenceData),
      insurance: JSON.parse(insuranceData),
    };
    const documentOptions = { new: true, upsert: true };

    const document = await Document.findOneAndUpdate(
      documentConditions,
      documentUpdates,
      documentOptions
    );

    console.log("Data saved successfully.");
  } catch (error) {
    console.error("Error saving data in MongoDB:", error);
  }
}

router.get("/documents", async (req, res) => {
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
    const images = await Image.find({ userId });
    res.status(200).json({ images });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ message: "Error fetching images" });
  }
});

router.get("/documentsInformation", async (req, res) => {
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

    const documentsInfo = await Document.find({ userId });
    res.status(200).json(documentsInfo);
  } catch (error) {
    console.error("Error fetching DocumentsInfo", error);
    res.status(500).json({ message: "Error fetching Documents Info" });
  }
});

module.exports = router;
