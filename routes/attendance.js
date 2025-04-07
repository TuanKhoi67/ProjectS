const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ScheduleModel = require('../models/Schedule');
const StudentModel = require('../models/Student');
const AttendanceModel = require('../models/Attendance');

// Phương thức GET để lấy tất cả điểm danh
router.get('/', async (req, res) => {
    try {
      // Lấy tất cả điểm danh từ database và populate thông tin sinh viên
      const attendances = await AttendanceModel.find()
        .populate('student_id')  // Lấy thông tin sinh viên từ bảng Student
        .sort({ date: -1 });  // Sắp xếp theo ngày gần nhất (tùy chọn)

        console.log(attendances); 
  
      // Phân loại sinh viên theo trạng thái có mặt và vắng mặt
      const presentStudents = attendances.filter(att => att.status === 'present');
      const absentStudents = attendances.filter(att => att.status === 'absent');

      console.log('Sinh viên có mặt:', presentStudents);
        console.log('Sinh viên vắng mặt:', absentStudents);
  
      // Render dữ liệu vào view attendance/status.hbs
      res.render('attendance/index', {
        presentStudents: presentStudents,
        absentStudents: absentStudents
      });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu điểm danh:', error);
      res.status(500).send('Lỗi khi lấy dữ liệu điểm danh.');
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