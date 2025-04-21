var mongoose = require('mongoose');
var ClassSchema = mongoose.Schema({
   classname: String,
   student: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'students',
    }],
   tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tutors', 
   },
   createDate: {
     type: Date,
      default: Date.now
     },
});

ClassSchema.methods.formatCreateDate = function () {
     const d = new Date(this.createDate);
     const day = String(d.getDate()).padStart(2, '0');
     const month = String(d.getMonth() + 1).padStart(2, '0');
     const year = d.getFullYear();
     return `${day}/${month}/${year}`;
 };

var ClassModel = mongoose.model('classes', ClassSchema); 
module.exports = ClassModel;
