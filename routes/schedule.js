var express = require('express');
var router = express.Router();
const sendEmailNotification = require("../services/mailer");
var ScheduleModel = require('../models/Schedule');
var TutorModel = require('../models/Tutor');
var StudentModel = require('../models/Student');

router.get('/', async (req, res) => {
    try {
        const schedules = await ScheduleModel.find({})
            .populate('student')
            .populate('tutor');  // Populate cả student và tutor trong một lần gọi

        console.log("Classes:", schedules); // Debug dữ liệu

        res.render('schedule/schedule_index', { schedules }); 
    } catch (error) {
        console.error("Error fetching class data:", error);
        res.status(500).send("Internal Server Error");
    }
}),

router.get('/add', async (req, res) => {
    try {
        const schedules = await ScheduleModel.find()
            .populate('student')  // Populate toàn bộ thông tin sinh viên
            .populate('tutor');    // Populate thông tin tutor

         const students = await StudentModel.find();
         const tutors = await TutorModel.find();

        console.log(schedules); // Kiểm tra dữ liệu trong console

        res.render('schedule/add_schedule', { schedules, students, tutors });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("Internal Server Error");
    }
}),

router.post('/add', async (req, res) => {
    try {
        const { time, subject, student, tutor } = req.body; // Nhận dữ liệu từ request

        // Kiểm tra nếu student không phải là một mảng
        if (!Array.isArray(student)) {
            return res.status(400).json({ message: "Students should be an array of ObjectIds" });
        }

        // Tạo và lưu lịch học vào database
        const newClass = new ScheduleModel({
            time,
            subject,
            student, // Danh sách sinh viên
            tutor,
        });

        await newClass.save();

        // Lấy thông tin email của tất cả sinh viên và tutor
        const studentsData = await StudentModel.find({ _id: { $in: student } }).select("email name");
        const tutorData = await TutorModel.findById(tutor).select("email name");

        if (studentsData.length > 0 && tutorData) {
            // Gửi email thông báo cho tất cả sinh viên
            for (const studentData of studentsData) {
                await sendEmailNotification(studentData.email, studentData.name, tutorData.name, time, subject);
            }
            // Gửi email thông báo cho tutor
            await sendEmailNotification(tutorData.email, tutorData.name, "Các sinh viên trong lớp", time, subject);
        }

        res.status(201).json({ message: "Class created successfully", class: newClass });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating class", error });
    }
});

module.exports = router;