const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ScheduleModel = require('../models/Schedule');
const StudentModel = require('../models/Student');
const AttendanceModel = require('../models/Attendance');
const ClassModel = require('../models/Class'); 
const { ensureAuthenticated, checkAdmin, checkStudent, checkTutor } = require('../middleware/auth');


router.get('/all', ensureAuthenticated, checkAdmin, async (req, res) => {
  try {
    // Lấy tất cả điểm danh và populate student_id
    const attendances = await AttendanceModel.find()
      .populate({ path: 'student_id' })
      .lean();

    // Lấy tất cả lớp học để tìm lớp của từng sinh viên
    const classes = await ClassModel.find().lean();

    // Gán tên lớp cho từng bản ghi điểm danh
    for (const att of attendances) {
      const studentId = att.student_id?._id?.toString();

      if (!studentId) {
        att.className = 'Not define';
        continue;
      }

      const foundClass = classes.find(c =>
        Array.isArray(c.student) &&
        c.student.some(s => s.toString() === studentId)
      );

      att.className = foundClass ? foundClass.classname : 'Not define';
    }

    res.render('attendance/index', { attendances });

  } catch (err) {
    console.error('Error when querying attendance data:', err);
    res.status(500).send('Error querying attendance data.');
  }
});

router.get('/take-attendance/:scheduleId', ensureAuthenticated, async (req, res) => {
    try {
      const scheduleId = req.params.scheduleId;
  
      if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
        return res.status(400).send('Invalid class schedule ID.');
      }
  
      const schedule = await ScheduleModel.findById(scheduleId)
        .populate({
          path: 'class',
          populate: { path: 'student' }
        });
    
        console.log('Schedule:', schedule);
  
      if (!schedule) {
        return res.status(404).send('Class schedule does not exist.');
      }
  
      if (!schedule.class) {
        return res.status(404).send('The schedule has no classes yet.');
      }

      console.log('Students:', schedule.class.student);
  
      res.render('attendance/take_attendance', { 
        schedule, 
        students: schedule.class.student || [] 
      });

    } catch (error) {
      console.error('Error when getting student list:', error); 
      res.status(500).send('Error getting student list.');
    }
  });

// Route xử lý điểm danh
router.post('/take-attendance/:scheduleId', ensureAuthenticated,  async (req, res) => {
  const { attendance } = req.body; // Object chứa student_id và trạng thái
  try {
    for (const [studentId, status] of Object.entries(attendance)) {
      const newAttendance = new AttendanceModel({
        student_id: studentId,
        status: status,
        date: new Date(),
      });
      await newAttendance.save();
    }

    res.redirect(`/attendance/take-attendance/${req.params.scheduleId}`);

  } catch (error) {
    console.error('Error saving attendance:', error); // Log chi tiết lỗi
    res.status(500).send('Error saving attendance.');
  }
});

router.get('/delete/:id', async (req, res) => {
  const id = req.params.id;

  try {
      await AttendanceModel.findByIdAndDelete(id);
      res.redirect('/attendance/all');
  } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting meeting');
  }
 });

module.exports = router;
