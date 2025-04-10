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
   student: [{ 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'students',
   }],
   tutor: [{ 
           type: mongoose.Schema.Types.ObjectId,
           ref: 'tutors',
   }],
   startTime: { 
        type: Date,  // Thời gian bắt đầu cuộc họp
        required: true 
   },
   endTime: { 
        type: Date,  // Thời gian kết thúc cuộc họp
        required: true 
   },
   note: String,
   createDate: {
     type: Date,
      default: Date.now
     },
});

MeetingSchema.methods.formatEnrollmentDate = function () {
     const date = this.enrollmentDate;
     const day = String(date.getDate()).padStart(2, '0');
     const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
     const year = date.getFullYear();
     return `${day}/${month}/${year}`;
  };

var MeetingModel = mongoose.model('meetings', MeetingSchema);
module.exports = MeetingModel;