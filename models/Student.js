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

<<<<<<< HEAD
StudentSchema.methods.formatEnrollmentDate = function () {
   const date = this.enrollmentDate;
   const day = String(date.getDate()).padStart(2, '0');
   const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
   const year = date.getFullYear();
   return `${day}/${month}/${year}`;
=======
// Format lại ngày tháng năm trước khi trả về dữ liệu JSON
StudentSchema.methods.formatEnrollmentDate = function () {
   return this.enrollmentDate.toISOString().split('T')[0];
>>>>>>> 1ac059a5e9eb7b5ebac7c3352e41da7709e44792
};

var StudentModel = mongoose.model('students', StudentSchema); 
module.exports = StudentModel;