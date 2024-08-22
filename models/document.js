const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  rcbook: {
    type: Object,
    required: true
  },
  license: {
    type: Object,
    required: true
  },
  insurance: {
    type: Object,
    required: true
  },
   consecutiveDays: {
    type: Number,
    default: 0 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
