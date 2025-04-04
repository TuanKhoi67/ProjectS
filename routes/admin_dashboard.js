const express = require('express');
const router = express.Router();
var ClassModel = require('../models/Class');
var StudentModel = require('../models/Student');
var TutorModel = require('../models/Tutor');


router.get('/', async (req, res) => {
    // Chạy hai truy vấn song song để tối ưu hiệu suất
    const [students, tutors, classes] = await Promise.all([
        StudentModel.find({}, 'name telephone email subject enrollmentYear'),
        TutorModel.find({}, 'name email telephone department'),   
        ClassModel.find({}, 'student')
    ]);

     // Lấy danh sách sinh viên đã được gán vào lớp
     const assignedStudentIds = classes.flatMap(cls => cls.student.map(s => s.toString()));

    // Lấy danh sách sinh viên chưa có lớp
    const unassignedStudents = await StudentModel.find({ _id: { $nin: assignedStudentIds } });

    // Render trang với tất cả dữ liệu cần thiết
    res.render('dashboard/index', {
        students,
        tutors,
        totalStudents: students.length,
        totalTutors: tutors.length,
        unassignedStudents
    });  
});

router.post('/add-student', async (req, res) => {
    const { name, telephone, email, subject } = req.body;

    const newStudent = new StudentModel({
        name,
        telephone,
        email,
        subject,
        enrollmentDate: new Date() // Set ngày, tháng, năm hiện tại
    });
    await newStudent.save();

    // Gửi sự kiện cập nhật danh sách sinh viên cho tất cả client
    const io = req.app.get('socketio');
    io.emit('studentAdded', { name, telephone,
        email,
        subject,
        enrollmentDate: newStudent.formatEnrollmentDate() });

    res.redirect('/admin/dashboard');
});

router.post('/add-tutor', async (req, res) => {
    const { name, email, telephone, department } = req.body;

    const newTeacher = new TutorModel({ 
         name,
         email,
         telephone,
         department
     });
    await newTeacher.save();

    // Gửi sự kiện cập nhật danh sách giáo viên qua Socket.io
    const io = req.app.get('socketio');
    io.emit('teacherAdded', { name, 
       email,
       telephone,
       department
    });

    res.redirect('/admin/dashboard'); 
});

router.get('/student-edit/:id', async (req, res) => {
    var id = req.params.id;
    var student = await StudentModel.findById(id);
    console.log(student);
    res.render('dashboard/student_edit', { student });
 })
 
 router.post('/student-edit/:id', async (req, res) => {
    var id = req.params.id;
    var student = req.body;
    try {
       //SQL: UPDATE brands SET A = B WHERE id = 'id'
       await StudentModel.findByIdAndUpdate(id, student);
       console.log('update succeed !');
    } catch (err) {
       console.log('update failed. Error: ' + err);
    }
    res.redirect('/admin/dashboard');
 });


// Lấy danh sách sinh viên chưa có lớp
router.get('/unassigned', async (req, res) => {
    try {
        // Lấy danh sách tất cả sinh viên đã có trong lớp
        const classes = await ClassModel.find({}, 'student');
        const assignedStudentIds = classes.flatMap(cls => cls.student.map(s => s.toString()));

        // Tìm tất cả sinh viên không có trong danh sách trên
        const unassignedStudents = await StudentModel.find({ _id: { $nin: assignedStudentIds } });

        res.render('dashboard/index', { unassignedStudents });
    } catch (error) {
        res.status(500).send("Lỗi khi lấy danh sách sinh viên chưa có lớp.");
    }
});







module.exports = router;