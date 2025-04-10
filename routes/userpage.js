const express = require('express');
const router = express.Router();
const User = require('../models/Users');

// Hiển thị trang Admin
router.get('/admin', async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' });
    const students = await User.find({ role: 'student' });
    res.render('userpage/admin', { user: req.user, tutors, students });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server khi lấy danh sách người dùng');
  }
});


router.get('/edit/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('userpage/edit', { user });
});

router.post('/edit/:id', async (req, res) => {
  const { fullname, email, role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { fullname, email, role });
  res.redirect('/userpage/admin');
});

router.get('/delete/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/userpage/admin');
});

router.post('/delete/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/userpage/admin');
});

// Get users by role
router.get('/users/role/:role', async (req, res) => {
  const users = await User.find({ role: req.params.role }).select('-password');
  res.json(users);
});

// Update user with role
router.put('/users/:id', async (req, res) => {
  const { name, email, role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { name, email, role });
  res.json({ message: 'User updated successfully' });
});

// Admin route to change user role
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'User role updated successfully' });
});


module.exports = router;