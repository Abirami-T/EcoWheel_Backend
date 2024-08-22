const Tesseract = require('tesseract.js');


async function recognizeTextFromImage(imageUrl) {
    try {
        console.log(`Processing image: ${imageUrl}`);
     
        const result = await Tesseract.recognize(
            imageUrl,
            'eng', // Specify the language for OCR (English in this case)
            { logger: m => console.log(m) } // Optional logger function to print progress
        );

       
        return result.data.text;
    } catch (error) {
        console.error(`Error recognizing text from image ${imageUrl}:`, error);
        return null;
    }
}

// Recognize text from front and back images of the RC book
async function recognizeRCBookText(rcbookFrontImageUrl, rcbookBackImageUrl) {
    try {
      
        const frontText = await recognizeTextFromImage(rcbookFrontImageUrl);

        const backText = await recognizeTextFromImage(rcbookBackImageUrl);

       
        return { frontText, backText };
    } catch (error) {
        console.error("Error recognizing RC book text:", error);
        return { frontText: null, backText: null };
    }
}

module.exports = {
    recognizeTextFromImage,
    recognizeRCBookText
};
