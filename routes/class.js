var express = require('express');
var router = express.Router();
var ClassModel = require('../models/Class');
var TutorModel = require('../models/Tutor');
var StudentModel = require('../models/Student');

router.get('/', async (req, res) => {
    try {
        const classes = await ClassModel.find({})
            .populate('student')
            .populate('tutor');  // Populate cả student và tutor trong một lần gọi

        console.log("Classes:", classes); // Debug dữ liệu

        res.render('class/class_index', { classes }); 
    } catch (error) {
        console.error("Error fetching class data:", error);
        res.status(500).send("Internal Server Error");
    }
}),

// Hiển thị trang tạo lớp học với bộ lọc
router.get('/create', async (req, res) => {
    try {
        res.render('class/add_class'); // Giao diện để chọn môn học
    } catch (error) {
        res.status(500).send('Lỗi khi tải trang tạo lớp học');
    }
});

router.post('/filter', async (req, res) => {
    try {
        const { subject } = req.body;

        const students = await StudentModel.find({ subject: subject });
        const tutors = await TutorModel.find({ department: subject });

        console.log("Students found:", students);
        console.log("Tutors found:", tutors);

        res.render('class/add_class', { students, tutors, subject });
    } catch (error) {
        res.status(500).send('Lỗi khi lọc sinh viên và giáo viên');
    }
});


// Xử lý tạo lớp học
router.post('/create', async (req, res) => {
    try {
        console.log("Request body:", JSON.stringify(req.body, null, 2));

        const { classname, studentIds, tutorId } = req.body;

        if (!classname || !studentIds || !tutorId) {
            return res.status(400).send("Thiếu dữ liệu đầu vào");
        }

        const newClass = new ClassModel({
            classname,
            student: studentIds,
            tutor: tutorId
        });

        await newClass.save();

        // Cập nhật tất cả sinh viên được chọn để thêm tutorId vào field "tutor"
        const updatedStudents = await StudentModel.updateMany(
            { _id: { $in: studentIds } }, 
            { tutor: tutorId }
        );

        console.log("Updated students:", updatedStudents);

        res.redirect('/class'); // Điều hướng sau khi tạo lớp thành công
    } catch (error) {
        console.error("Lỗi khi tạo lớp học:", error);  // In lỗi chi tiết
        res.status(500).send(`Lỗi khi tạo lớp học: ${error.message}`);
    }
});

module.exports = router;