var mongoose = require('mongoose');
var TutorSchema = mongoose.Schema(
{
      name: String,
      email: String,
      telephone: String,
      department: String,
      enrollmentDate: {
            type: Date,
            default: Date.now
      },
      user: {  // Thêm mối quan hệ 1-1 với bảng Users
              type: mongoose.Schema.Types.ObjectId,
              ref: 'users',
      }
});

TutorSchema.methods.formatEnrollmentDate = function () {
      const date = this.enrollmentDate;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
};

var TutorModel = mongoose.model('tutors', TutorSchema);
module.exports = TutorModel;