var mongoose = require('mongoose');
var ClassSchema = mongoose.Schema({
   classname: String,
   student: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'students'  
    }],
   tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tutors'  
   },
});

var ClassModel = mongoose.model('classes', ClassSchema); 
module.exports = ClassModel;