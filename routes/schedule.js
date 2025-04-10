var express = require('express');
var router = express.Router();
//const { sendEmail } = require("../services/mailer");
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


    res.render('schedule/schedule_index', { 
        title: 'Schedule', 
        schedules, 
        week: weekOffset, 
        weekRange, // Thêm khoảng thời gian của tuần
        prevWeek: Math.max(1, weekOffset - 1), 
        nextWeek: weekOffset + 1 ,
        layout: 'authedLayout'
    });
});

// Hiển thị form tạo lịch học
router.get('/add', async (req, res) => {
    try {
        const classes = await ClassModel.find(); // Lấy danh sách tất cả lớp học
        res.render('schedule/add_schedule', { 
            title: 'Add Schedule',
            classes // Truyền danh sách lớp học vào giao diện
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error server");
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
        const subject = "Schedule notification";
        const message = `Schedule created:\nDate: ${day}\nSlot: ${time}\n Pay attention to the schedule.`;
        await sendEmail(emailList, subject, message);
        
        res.redirect('/schedule/schedule-view/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error when add schedule.");
    }
});

router.get('/edit/:id', async (req, res) => {
    try {
        const schedule = await ScheduleModel.findById(req.params.id)
            .populate('class')
            .lean(); // Trả về dữ liệu JSON thuần

        if (!schedule) {
            return res.status(404).send("The class does not exist.");
        }

        const classes = await ClassModel.find().lean(); // Lấy danh sách lớp học

        console.log("Class list:", classes);

        res.render('schedule/edit', { 
            schedule, 
            classes, 
            selectedClassId: schedule.class ? schedule.class._id.toString() : null
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Errror when edit schedule.");;
    }
});

router.post('/edit/:id', async (req, res) => {
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
            return res.status(404).send("The class does not exist.");
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
        const subject = "Schedule update";
        const message = `New schedule of ${classObj.name} on ${day}, at ${time}.`;

        await sendEmail(emails, subject, message);

        res.redirect('/schedule/schedule-view/0');

    } catch (err) {
        console.error(err);
        res.status(500).send("Error when edit schedule.");
    }
});

router.get('/delete/:id', async (req, res) => {
    await ScheduleModel.findByIdAndDelete(req.params.id);
    res.redirect('/schedule/schedule-view/');
 })

module.exports = router;