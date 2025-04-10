const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
      type: Date,
      default: Date.now
  },
  imageUrl: {
    type: String,
    required: true
  },
  documentFile: {
    type: String,
    required: false
  },
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
  
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;