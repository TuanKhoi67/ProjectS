var mongoose = require('mongoose');
var StudentSchema = mongoose.Schema({
   name: String,
   telephone: String,
   email: String,
   subject: String,
   enrollmentYear: Number,
   tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tutors'  
   },
   user: {  // Thêm mối quan hệ 1-1 với bảng Users
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
   }
});

var StudentModel = mongoose.model('students', StudentSchema); 
module.exports = StudentModel;