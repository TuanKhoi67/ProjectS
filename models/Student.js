// models/Student.js
const mongoose = require('mongoose');
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tutors'  
  },
  user: {  // Thêm mối quan hệ 1-1 với bảng Users
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
  }
});
module.exports = mongoose.model('Student', StudentSchema);
