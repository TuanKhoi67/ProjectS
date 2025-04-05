var mongoose = require('mongoose');
var TutorSchema = mongoose.Schema(
{
      name: String,
      department: String,
      email: String,
      telephone: String,
      user: {  // Thêm mối quan hệ 1-1 với bảng Users
              type: mongoose.Schema.Types.ObjectId,
              ref: 'users',
      }
});
var TutorModel = mongoose.model('tutors', TutorSchema);
module.exports = TutorModel;