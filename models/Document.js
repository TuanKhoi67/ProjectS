const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  comments: [
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        username: String, 
        text: String, 
        createdAt: { type: Date, default: Date.now } 
    }
  ],
  createDate: {
    type: Date,
     default: Date.now
    }
});

documentSchema.methods.formatEnrollmentDate = function () {
  const date = this.enrollmentDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;