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
router.get('/add', async (req, res) => {
    try {
        const classes = await ClassModel.find(); // Lấy danh sách tất cả lớp học
        res.render('schedule/add', { 
            title: 'Thêm Lịch Học',
            classes // Truyền danh sách lớp học vào giao diện
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
});

router.post('/add', async (req, res) => {
    try {
        const { day, time, class: classId } = req.body;
        const classObj = await ClassModel.findById(classId);

        if (!classObj) {
            return res.status(400).send("Lớp học không tồn tại.");
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
        const subject = "Thông báo lịch học mới";
        const message = `Đã có lịch học mới vào Ngày: ${day} - Ca học: ${time}\n Các bạn chú ý kiểm tra lịch học mới`;
        await sendEmail(emailList, subject, message);
        
        res.redirect('/schedule/schedule-view/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi thêm lịch học.");
    }
});

router.get('/edit/:id', async (req, res) => {
    try {
        const schedule = await ScheduleModel.findById(req.params.id)
            .populate('class')
            .lean(); // Trả về dữ liệu JSON thuần

        console.log("Schedule:", schedule);

        if (!schedule) {
            return res.status(404).send("Lịch học không tồn tại.");
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
        res.status(500).send("Lỗi khi tải trang chỉnh sửa.");
    }
});

router.post('/edit/:id', async (req, res) => {
    try {
        // Lấy dữ liệu từ request body (đổi class thành classId)
        const { day, time, classId } = req.body;

        // Tìm lớp học theo ID
        const classObj = await ClassModel.findById(classId).lean(); // Thêm .lean()
        if (!classObj) {
            return res.status(400).send("Lớp học không tồn tại.");
        }

        // Tìm lịch học cũ
        const oldSchedule = await ScheduleModel.findById(req.params.id);
        if (!oldSchedule) {
            return res.status(404).send("Lịch học không tồn tại.");
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
        const subject = "Đã có sự thay đổi lịch học";
        const message = `Lịch học mới của lớp ${classObj.name} vào ngày ${day}, ca ${time}.`;

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
