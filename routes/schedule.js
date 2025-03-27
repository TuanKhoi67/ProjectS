var express = require('express');
var router = express.Router();
const { sendEmail } = require("../services/mailer");
const moment = require('moment'); 
var ScheduleModel = require('../models/Schedule');
var ClassModel = require('../models/Class');
var TutorModel = require('../models/Tutor');
var StudentModel = require('../models/Student');


router.get('/schedule-view/:weekOffset?', async (req, res) => {
    let weekOffset = parseInt(req.params.weekOffset) || 1;

    // Tính toán ngày bắt đầu (thứ 2) và ngày kết thúc (chủ nhật) của tuần
    let startOfWeek = moment().startOf('isoWeek').add(weekOffset - 1, 'weeks'); // Thứ 2
    let endOfWeek = moment().endOf('isoWeek').add(weekOffset - 1, 'weeks'); // Chủ nhật
    let weekRange = `${startOfWeek.format('DD/MM')} - ${endOfWeek.format('DD/MM')}`;
    
    const schedules = await ScheduleModel.find()
        .populate('class', 'classname') // Populate lấy tên lớp từ collection 'classes'
        .lean(); // Chuyển dữ liệu sang object để Handlebars đọc được

    res.render('schedule/schedule_index', { 
        title: 'Lịch Học', 
        schedules, 
        week: weekOffset, 
        weekRange, // Thêm khoảng thời gian của tuần
        prevWeek: Math.max(1, weekOffset - 1), 
        nextWeek: weekOffset + 1 
    });
});

// Hiển thị form tạo lịch học
router.get('/add', (req, res) => {
    res.render('schedule/add_schedule', { title: 'Thêm Lịch Học' });
});


router.post('/add', async (req, res) => {
    try {
        const { day, time, classname } = req.body;

        // Tìm lớp học theo tên
        const classObj = await ClassModel.findOne({ name: classname });

        if (!classObj) {
            return res.status(400).send("Lớp học không tồn tại.");
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
            class: classObj._id,
        });

        await newSchedule.save();

        // Gửi email thông báo
        const subject = "Thông báo lịch học mới";
        const message = `Lịch học mới đã được tạo:\nNgày: ${day}\nCa học: ${time}\n Các bạn chú ý kiểm tra lịch học mới`;
        await sendEmail(emailList, subject, message);
        
        res.redirect('/schedule/schedule-view/0');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi thêm lịch học.");
    }
});

module.exports = router;