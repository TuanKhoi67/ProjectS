var mongoose = require('mongoose');
var StudentSchema = mongoose.Schema({
   name: String,
   telephone: String,
   email: String,
   subject: String,
   imageStudent: {
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

StudentSchema.methods.formatEnrollmentDate = function () {
   const date = this.enrollmentDate;
   const day = String(date.getDate()).padStart(2, '0');
   const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
   const year = date.getFullYear();
   return `${day}/${month}/${year}`;
};

var StudentModel = mongoose.model('students', StudentSchema); 
module.exports = StudentModel;
