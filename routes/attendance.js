const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ScheduleModel = require('../models/Schedule');
const StudentModel = require('../models/Student');
const AttendanceModel = require('../models/Attendance');
const ClassModel = require('../models/Class'); // đảm bảo bạn import đúng model clas


router.get('/all', async (req, res) => {
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
        att.className = 'Không xác định';
        continue;
      }

      const foundClass = classes.find(c =>
        Array.isArray(c.student) &&
        c.student.some(s => s.toString() === studentId)
      );

      att.className = foundClass ? foundClass.classname : 'Không xác định';
    }

    res.render('attendance/index', { attendances });

  } catch (err) {
    console.error('Lỗi khi truy vấn dữ liệu điểm danh:', err);
    res.status(500).send('Lỗi khi truy vấn dữ liệu điểm danh.');
  }
});

  

// Route hiển thị danh sách sinh viên dựa trên lịch học
router.get('/take-attendance/:scheduleId', async (req, res) => {
    try {
      const scheduleId = req.params.scheduleId;
  
      // Kiểm tra nếu scheduleId không hợp lệ
      if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
        return res.status(400).send('ID lịch học không hợp lệ.');
      }
  
      // Tìm lịch học và populate thông tin lớp học & sinh viên
      const schedule = await ScheduleModel.findById(scheduleId)
        .populate({
          path: 'class',
          populate: { path: 'student' }
        });
    
        console.log('Schedule:', schedule);
  
      // Kiểm tra nếu không tìm thấy lịch học
      if (!schedule) {
        return res.status(404).send('Lịch học không tồn tại.');
      }
  
      // Kiểm tra nếu không có lớp học
      if (!schedule.class) {
        return res.status(404).send('Lịch học chưa có lớp học.');
      }

      console.log('Students:', schedule.class.student);
  
      res.render('attendance/take_attendance', { 
        schedule, 
        students: schedule.class.student || [] // Đảm bảo students luôn có giá trị
      });

    } catch (error) {
      console.error('Lỗi khi lấy danh sách sinh viên:', error); // In lỗi để debug
      res.status(500).send('Lỗi khi lấy danh sách sinh viên.');
    }
  });

// Route xử lý điểm danh
router.post('/take-attendance/:scheduleId', async (req, res) => {
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
    console.error('Lỗi khi lưu điểm danh:', error); // Log chi tiết lỗi
    res.status(500).send('Lỗi khi lưu điểm danh.');
  }
});

module.exports = router;
