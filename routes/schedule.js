var express = require('express');
var router = express.Router();
const { sendEmail } = require("../services/mailer");
const moment = require('moment'); 
var ScheduleModel = require('../models/Schedule');
var ClassModel = require('../models/Class');
var TutorModel = require('../models/Tutor');
var StudentModel = require('../models/Student');
const { ensureAuthenticated, checkAdmin, checkTutor } = require('../middleware/auth');

router.get('/tutor-attendance', ensureAuthenticated,  async (req, res) => {
    try {
      const user = req.user; // do Passport gán user vào req.user
  
      if (user.role === 'tutor') {
        const tutor = await TutorModel.findOne({ email: user.email });
  
        if (!tutor) {
          req.flash('error', 'No matching teacher found!');
          return res.redirect('/auth/login');
        }
  
        const classes = await ClassModel.find({ tutor: tutor._id });
        const classIds = classes.map(cls => cls._id);
  
        const schedules = await ScheduleModel.find({ class: { $in: classIds } })
          .populate('class');
  
        return res.render('schedule/tutor-attendance', {
          tutor: {
            id: tutor._id,
            name: tutor.name,
            email: tutor.email,
          },
          schedules: schedules.map(sch => ({
            _id: sch._id,
            day: sch.day,
            time: sch.time,
            classname: sch.class.classname
          }))
        });
      } else {
        // Role khác (student, admin)
        return res.render('/', { user });
      }
  
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error displaying dashboard');
      res.redirect('/auth/login');
    }
  });


router.get('/schedule-view/:weekOffset?', async (req, res) => {
    let weekOffset = parseInt(req.params.weekOffset) || 1;

    // Tính toán ngày bắt đầu (thứ 2) và ngày kết thúc (chủ nhật) của tuần
    let startOfWeek = moment().startOf('isoWeek').add(weekOffset - 1, 'weeks'); // Thứ 2
    let endOfWeek = moment().endOf('isoWeek').add(weekOffset - 1, 'weeks'); // Chủ nhật
    let weekRange = `${startOfWeek.format('DD/MM')} - ${endOfWeek.format('DD/MM')}`;
    
    const schedules = await ScheduleModel.find().populate({ path: 'class', select: 'classname' }).lean();


    res.render('schedule/index', { 
        title: 'Lịch Học', 
        schedules, 
        week: weekOffset, 
        weekRange, // Thêm khoảng thời gian của tuần
        prevWeek: Math.max(1, weekOffset - 1), 
        nextWeek: weekOffset + 1 
    });
});

// Hiển thị form tạo lịch học
router.get('/add', checkAdmin, async (req, res) => {
    try {
        const classes = await ClassModel.find(); // Lấy danh sách tất cả lớp học
        res.render('schedule/add', { 
            title: 'Add Class Schedule',
            classes // Truyền danh sách lớp học vào giao diện
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error!!!");
    }
});

router.post('/add', async (req, res) => {
    try {
        const { day, time, class: classId } = req.body;
        const classObj = await ClassModel.findById(classId);

        if (!classObj) {
            return res.status(400).send("The class does not exist.");
        }

        // Kiểm tra lịch học đã tồn tại chưa (cùng ngày, cùng ca, cùng lớp)
        const existingSchedule = await ScheduleModel.findOne({
            day,
            time,
            class: classObj._id
        });

        if (existingSchedule) {
            return res.redirect(`/schedule/add?error=exists&classId=${classId}`);
        }

        // Lấy danh sách sinh viên và giáo viên từ lớp học
        const students = await StudentModel.find({ _id: { $in: classObj.student } });
        const tutor = await TutorModel.findById(classObj.tutor);

        // Tạo danh sách email
        const emailList = students.map(student => student.email);
        if (tutor) {
            emailList.push(tutor.email);
        }

        // Lưu ObjectId của lớp học
        const newSchedule = new ScheduleModel({
            day,
            time,
            class: classObj._id
        });

        await newSchedule.save();

        // Gửi email thông báo
        const subject = "New class schedule announcement";
        const message = `New class schedule available on Date: ${day} - Class: ${time}\n Please pay attention to check the new schedule.`;
        await sendEmail(emailList, subject, message);
        
        res.redirect('/schedule/schedule-view/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error!!!");
    }
});

router.get('/edit/:id', async (req, res) => {
    try {
        const schedule = await ScheduleModel.findById(req.params.id)
            .populate('class')
            .lean(); // Trả về dữ liệu JSON thuần

        console.log("Schedule:", schedule);

        if (!schedule) {
            return res.status(404).send("Class schedule does not exist.");
        }

        const classes = await ClassModel.find().lean(); // Lấy danh sách lớp học

        console.log("Danh sách lớp học:", classes);
        console.log("Selected ClassId:", schedule.class ? schedule.class._id.toString() : null);

        console.log("Danh sách lớp học:", classes);

        res.render('schedule/edit', { 
            schedule, 
            classes, 
            selectedClassId: schedule.class ? schedule.class._id.toString() : null
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading edit page.");
    }
});

router.post('/edit/:id', checkAdmin,async (req, res) => {
    try {
        // Lấy dữ liệu từ request body (đổi class thành classId)
        const { day, time, classId } = req.body;

        // Tìm lớp học theo ID
        const classObj = await ClassModel.findById(classId).lean(); // Thêm .lean()
        if (!classObj) {
            return res.status(400).send("The class does not exist.");
        }

        // Tìm lịch học cũ
        const oldSchedule = await ScheduleModel.findById(req.params.id);
        if (!oldSchedule) {
            return res.status(404).send("Class schedule does not exist.");
        }

        // Kiểm tra lịch học đã tồn tại chưa (cùng ngày, cùng ca, cùng lớp)
        const existingSchedule = await ScheduleModel.findOne({
            day,
            time,
            class: classObj._id
        });

        if (existingSchedule) {
            return res.redirect(`/schedule/add?error=exists&classId=${classId}`);
        }

        // Cập nhật thông tin lịch học
        const updatedSchedule = await ScheduleModel.findByIdAndUpdate(
            req.params.id,
            { day, time, class: classObj._id },
            { new: true }
        ).populate('class');

        // Lấy danh sách sinh viên và giảng viên trong lớp
        const students = await StudentModel.find({ class: classObj._id });
        const tutors = await TutorModel.find({ class: classObj._id });

        // Gửi email thông báo cập nhật lịch học
        const emails = [...students.map(s => s.email), ...tutors.map(t => t.email)];
        const subject = "There has been a change in the school schedule.";
        const message = `New class schedule ${classObj.name} on the day ${day}, slot ${time}.`;

        await sendEmail(emails, subject, message);

        res.redirect('/schedule/schedule-view/0');

    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi cập nhật lịch học.");
    }
});

router.get('/delete/:id', async (req, res) => {
    await ScheduleModel.findByIdAndDelete(req.params.id);
    res.redirect('/schedule/schedule-view/');
 })

module.exports = router;
