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
   return this.enrollmentDate.toISOString().split('T')[0];
};

module.exports = mongoose.model('Student', StudentSchema);