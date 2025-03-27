const express = require('express');
const router = express.Router();
const socketIo = require("socket.io");
const http = require("http");
const server = http.createServer(express);
const io = socketIo(server);
var StudentModel = require('../models/Student');
var TutorModel = require('../models/Tutor');


router.get('/', async (req, res) => {
    // Chạy hai truy vấn song song để tối ưu hiệu suất
    const [students, tutors, studentsWithoutTutor] = await Promise.all([
        StudentModel.find({}, 'name subject'),
        TutorModel.find({}, 'name department'),  
        StudentModel.find({tutor: { $in: [null, undefined] }}, 'name subject'),  
    ]);

    // Render trang với tất cả dữ liệu cần thiết
    res.render('dashboard/index', {
        students,
        tutors,
        studentsWithoutTutor,
        totalStudents: students.length,
        totalTutors: tutors.length,
        totalStudentsWithoutTutor: studentsWithoutTutor.length
    });  
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

 router.get('/filter', async (req, res) => {
    try {
        const { subject } = req.query; 

        if (!subject) {
            return res.status(400).send("Vui lòng chọn môn học.");
        }
        
        const teachers = await TutorModel.find({ department: subject });

        // console.log("Tutors found:", teachers);

        res.render('dashboard/index', { teachers, subject });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi lấy danh sách giáo viên.');
    }
});


 // Đang tham khảo - không động vào
//  router.post('/add-student', async (req, res) => {
//     const { name } = req.body;
//     if (!name) return res.status(400).send('Tên không được để trống');

//     const newStudent = new StudentModel({ name });
//     await newStudent.save();

//     // Gửi sự kiện cập nhật danh sách sinh viên cho tất cả client
//     io.emit('studentAdded', { name });

//     res.redirect('/admin/dashboard');
// });

module.exports = router;