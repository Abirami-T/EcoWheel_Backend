const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    rcbookfrontImageURL: {
        type: String,
        required: true
    },
    rcbookbackImageURL: {
        type: String,
        required: false  
    },
    licencefrontImageURL: {
        type: String,
        required: true
    },
    licencebackImageURL:{
        type: String,
        required: false  
    },
    insurancefrontImageURL: {
        type: String,
        required: true
    },
    cloudinaryId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
