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

        res.render('class/index', { classes }); 
    } catch (error) {
        console.error("Error fetching class data:", error);
        res.status(500).send("Internal Server Error");
    }
}),


// Hiển thị trang tạo lớp học với bộ lọc
router.get('/create', async (req, res) => {
    try {
        res.render('class/add'); // Giao diện để chọn môn học
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

        res.render('class/add', { students, tutors, subject });
    } catch (error) {
        res.status(500).send('Lỗi khi lọc sinh viên và giáo viên');
    }
});


// Xử lý tạo lớp học
router.post('/create', async (req, res) => {
    try {
        console.log("Request body:", JSON.stringify(req.body, null, 2));

        let { classname, studentIds, tutorId } = req.body;

        // Ép kiểu nếu chỉ có 1 sinh viên
        if (!Array.isArray(studentIds)) {
            studentIds = [studentIds];
        }

        // Kiểm tra tên lớp đã tồn tại chưa
        const existingClass = await ClassModel.findOne({ classname });
        if (existingClass) {
            return res.status(400).json({success: false, message:"Tên lớp đã tồn tại. Vui lòng chọn tên khác."});
        }

        // Kiểm tra số lượng sinh viên không vượt quá 10
        if (studentIds.length > 10) {
            return res.status(400).json({success: false, message:"Một lớp không được có quá 10 sinh viên."});
        }

        const newClass = new ClassModel({
            classname,
            student: studentIds,
            tutor: tutorId
        });

        await newClass.save();

        //res.redirect('/class'); // Điều hướng sau khi tạo lớp thành công
        res.status(200).json({success: false, message: "Tạo lớp thành công!" }); // bỏ res.redirect
    } catch (error) {
        console.error("Lỗi khi tạo lớp học:", error);  // In lỗi chi tiết
        res.status(500).json(`Lỗi khi tạo lớp học: ${error.message}`);
    }
});


router.get('/search-student', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.render('class/add', { error: "Vui lòng nhập email sinh viên!", studentResult: null, classes: [] });
        }

        const student = await StudentModel.findOne({ email });

        if (!student) {
            return res.render('class/add', { error: "Không tìm thấy sinh viên!", studentResult: null, classes: [] });
        }

        // Lấy danh sách giáo viên có department trùng với subject của sinh viên
        const tutors = await TutorModel.find({ department: student.subject });

        // Lấy danh sách lớp có ít hơn 10 sinh viên
        const classes = await ClassModel.find().populate('student');
        const availableClasses = classes.filter(c => c.student.length < 10);

        res.render('class/add', { studentResult: student, classes: availableClasses, tutors, error: null });
    } catch (error) {
        console.error("Lỗi khi tìm kiếm sinh viên:", error);
        res.render('class/add', { error: 'Lỗi khi tìm kiếm sinh viên', studentResult: null, classes: [] });
    }
});

router.post('/assign-student', async (req, res) => {
    try {
        const { studentId, classId } = req.body;

        const selectedClass = await ClassModel.findById(classId).populate('student');

        // Kiểm tra nếu sinh viên đã tồn tại trong lớp
        const isAlreadyInClass = selectedClass.student.some(
            (s) => s._id.toString() === studentId
        );

        if (isAlreadyInClass) {
            return res.json({ success: false, message: "Sinh viên đã có trong lớp." });
        }

        await ClassModel.findByIdAndUpdate(classId, { $push: { student: studentId } });

        //res.redirect('/class');
        // Trả về thông báo thành công để frontend redirect
        res.json({ success: true, message: "Thêm sinh viên thành công!" });
    } catch (error) {
        console.error("Lỗi khi thêm sinh viên vào lớp:", error);
        res.status(500).json('Lỗi khi thêm sinh viên vào lớp');
    }
});

router.post('/create-class', async (req, res) => {
    try {
        const { classname, studentId, tutorId } = req.body;

        if (!classname || !studentId || !tutorId) {
            return res.status(400).json("Thiếu dữ liệu đầu vào");
        }

        const newClass = new ClassModel({
            classname,
            student: [studentId], // Thêm sinh viên ngay khi tạo lớp
            tutor: tutorId
        });

        await newClass.save();

        res.redirect('/class'); 
    } catch (error) {
        console.error("Lỗi khi tạo lớp học:", error);
        res.status(500).send('Lỗi khi tạo lớp học');
    }
});

// Xóa document theo ID
router.get('/delete/:id', async (req, res) => {
    try {
        await ClassModel.findByIdAndDelete(req.params.id);
        res.redirect('/class'); // hoặc route hiển thị danh sách lớp học
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi xóa lớp học.");
    }
});

module.exports = router;
