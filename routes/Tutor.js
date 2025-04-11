const express = require('express');
const router = express.Router();
const tutor = require('../models/Tutor');
const Student = require('../models/Student');

// Hiển thị danh sách tutor
router.get('/', async (req, res) => {
  const tutors = await tutor.find();
  res.render('tutor/index', { tutors });
});

// Form thêm tutor
router.get('/add', (req, res) => {
  res.render('tutor/add');
});

// Xử lý thêm tutor
router.post('/add', async (req, res) => {
  const { name, email, phone } = req.body;
  await tutor.create({ name, email, phone });
  res.redirect('/tutor');
});

// Gán/đổi tutor cho sinh viên
router.post('/assign', async (req, res) => {
  const { studentId, tutorId } = req.body;
  await Student.findByIdAndUpdate(studentId, { tutor: tutorId });
  // Sau đó có thể tích hợp gửi email thông báo
  res.redirect('/dashboard');
});

module.exports = router;
