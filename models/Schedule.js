var mongoose = require('mongoose');
var ScheduleSchema = mongoose.Schema({
   day: String,
   time: String,
   class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'classes'  
   },
});

var ScheduleModel = mongoose.model('schedules', ScheduleSchema); 
module.exports = ScheduleModel;