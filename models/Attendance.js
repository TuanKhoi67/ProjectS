var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const attendanceSchema = new Schema({
  student_id: {
    type: Schema.Types.ObjectId,
    ref: 'students',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

var Attendance = mongoose.model('attendances', attendanceSchema);
module.exports = Attendance;
