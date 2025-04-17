var mongoose = require('mongoose');
var TutorSchema = mongoose.Schema({
  name: String,
  email: String,
  telephone: String,
  department: String,
  imageTutor: { 
        type: String, 
        default: '/images/default.jpg' // Đường dẫn mặc định
      },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('Tutor', TutorSchema);