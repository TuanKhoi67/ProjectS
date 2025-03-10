var mongoose = require('mongoose');
var ScheduleSchema = mongoose.Schema({
   time: String,
   subject: String,
   student: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'students'  
    }],
   tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tutors'  
   },
});

var ScheduleModel = mongoose.model('schedules', ScheduleSchema); 
module.exports = ScheduleModel;