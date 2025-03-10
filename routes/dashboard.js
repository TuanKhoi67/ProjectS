const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.user.role === 'student') {
    res.render('dashboard/student', { user: req.user });
  } else if (req.user.role === 'tutor') {
    res.render('dashboard/tutor', { user: req.user });
  } else if (req.user.role === 'admin') {
    res.render('dashboard/admin', { user: req.user });
  } else {
    res.send('Dashboard không xác định');
  }
});

// Ví dụ dashboard cho staff xem danh sách giáo viên và sinh viên
router.get('/staff/teachers', async (req, res) => {
  const teachers = await require('../models/Users').find({ role: 'tutor' });
  res.render('dashboard/staff_teachers', { teachers });
});

router.get('/staff/students', async (req, res) => {
  const students = await require('../models/Users').find({ role: 'student' });
  res.render('dashboard/staff_students', { students });
});

module.exports = router;