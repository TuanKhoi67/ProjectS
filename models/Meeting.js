var mongoose = require('mongoose');
var MeetingSchema = mongoose.Schema({
   title: String,
   form: String,
   location: String,
   status: {
        type: String,
        enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
        required: true,
    },
   note: String
});

var MeetingModel = mongoose.model('meetings', MeetingSchema);
module.exports = MeetingModel;