var express = require('express');
var router = express.Router();
var ClassModel = require('../models/Class');
var TutorModel = require('../models/Tutor');
var StudentModel = require('../models/Student');
const { ensureAuthenticated, checkAdmin, checkStudent, checkTutor } = require('../middleware/auth');

router.get('/', ensureAuthenticated, checkAdmin, async (req, res) => {
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
router.get('/create',ensureAuthenticated, checkAdmin, async (req, res) => {
    try {
        res.render('class/add'); // Giao diện để chọn môn học
    } catch (error) {
        res.status(500).send('Error loading class creation page');
    }
});

router.post('/filter', ensureAuthenticated, checkAdmin, async (req, res) => {
    try {
        const { subject } = req.body;

        const students = await StudentModel.find({ subject: subject });
        const tutors = await TutorModel.find({ department: subject });

        console.log("Students found:", students);
        console.log("Tutors found:", tutors);

        res.render('class/add', { students, tutors, subject });
    } catch (error) {
        res.status(500).send('Error filtering students and teachers');
    }
});


// Xử lý tạo lớp học
router.post('/create', ensureAuthenticated, checkAdmin, async (req, res) => {
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
            return res.status(400).json({success: false, message:"Class name already exists. Please choose another name."});
        }

        // Kiểm tra số lượng sinh viên không vượt quá 10
        if (studentIds.length > 10) {
            return res.status(400).json({success: false, message:"A class should not have more than 10 students."});
        }

        const newClass = new ClassModel({
            classname,
            student: studentIds,
            tutor: tutorId
        });

        await newClass.save();

        //res.redirect('/class'); // Điều hướng sau khi tạo lớp thành công
        res.status(200).json({success: false, message: "Class created successfully!" }); // bỏ res.redirect
    } catch (error) {
        console.error("Error creating class:", error);  // In lỗi chi tiết
        res.status(500).json(`Error creating class: ${error.message}`);
    }
});


router.get('/search-student', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.render('class/add', { error: "Please enter student email!", studentResult: null, classes: [] });
        }

        const student = await StudentModel.findOne({ email });

        if (!student) {
            return res.render('class/add', { error: "No students found!", studentResult: null, classes: [] });
        }

        // Lấy danh sách giáo viên có department trùng với subject của sinh viên
        const tutors = await TutorModel.find({ department: student.subject });

        // Lấy danh sách lớp có ít hơn 10 sinh viên
        const classes = await ClassModel.find().populate('student');
        const availableClasses = classes.filter(c => c.student.length < 10);

        res.render('class/add', { studentResult: student, classes: availableClasses, tutors, error: null });
    } catch (error) {
        console.error("Error while searching for students:", error);
        res.render('class/add', { error: 'Error while searching for students', studentResult: null, classes: [] });
    }
});

router.post('/assign-student', ensureAuthenticated, async (req, res) => {
    try {
        const { studentId, classId } = req.body;

        const selectedClass = await ClassModel.findById(classId).populate('student');

        // Kiểm tra nếu sinh viên đã tồn tại trong lớp
        const isAlreadyInClass = selectedClass.student.some(
            (s) => s._id.toString() === studentId
        );

        if (isAlreadyInClass) {
            return res.json({ success: false, message: "Students are already in class." });
        }

        await ClassModel.findByIdAndUpdate(classId, { $push: { student: studentId } });

        //res.redirect('/class');
        // Trả về thông báo thành công để frontend redirect
        res.json({ success: true, message: "More students successfully!" });
    } catch (error) {
        console.error("Error adding student to class:", error);
        res.status(500).json('Error adding student to class');
    }
});

router.post('/create-class', ensureAuthenticated, checkAdmin, async (req, res) => {
    try {
        const { classname, studentId, tutorId } = req.body;

        if (!classname || !studentId || !tutorId) {
            return res.status(400).json("Missing input data");
        }

        const newClass = new ClassModel({
            classname,
            student: [studentId], // Thêm sinh viên ngay khi tạo lớp
            tutor: tutorId
        });

        await newClass.save();

        res.redirect('/class'); 
    } catch (error) {
        console.error("Error creating class:", error);
        res.status(500).send('Error creating class');
    }
});

// Route hiển thị form chỉnh sửa lớp học
router.get('/edit/:classId', async (req, res) => {
    try {
        const classId = req.params.classId;
        // Tìm lớp học theo classId
        const classData = await ClassModel.findById(classId).populate('student').populate('tutor');
        // Lấy danh sách tất cả sinh viên và giáo viên để tạo dropdown
        const students = await StudentModel.find();
        const tutors = await TutorModel.find();
        
        // Render form chỉnh sửa lớp học, truyền dữ liệu lớp học, danh sách sinh viên và giáo viên
        res.render('class/edit', {
            classData,
            students,
            tutors
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error!');
    }
});

// Route xử lý việc cập nhật lớp học
router.post('/edit/:classId', async (req, res) => {
    try {
        const classId = req.params.classId;
        const { classname, student, tutor } = req.body;

        // Cập nhật thông tin lớp học
        await ClassModel.findByIdAndUpdate(classId, { classname, student, tutor });

        // Chuyển hướng về trang chi tiết lớp học sau khi cập nhật thành công
        res.redirect("/class");
    } catch (error) {
        console.error(error);
        res.status(500).send('Error!!!');
    }
});

// Xóa document theo ID
router.get('/delete/:id', async (req, res) => {
    try {
        await ClassModel.findByIdAndDelete(req.params.id);
        res.redirect('/class'); // hoặc route hiển thị danh sách lớp học
    } catch (err) {
        console.error(err);
        res.status(500).send("Error!!!");
    }
});

module.exports = router;
