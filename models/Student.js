var mongoose = require('mongoose');
var StudentSchema = mongoose.Schema({
   name: String,
   telephone: String,
   email: String,
   subject: String,
   enrollmentDate: {
      type: Date,
      default: Date.now
  },
   user: {  // Thêm mối quan hệ 1-1 với bảng Users
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
   }
});

// Format lại ngày tháng năm trước khi trả về dữ liệu JSON
StudentSchema.methods.formatEnrollmentDate = function () {
   return this.enrollmentDate.toISOString().split('T')[0];
};

var StudentModel = mongoose.model('students', StudentSchema); 
module.exports = StudentModel;