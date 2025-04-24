const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcrypt');

// Hiển thị trang Admin
router.get('/admin', async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' });
    const students = await User.find({ role: 'student' });
    const admins = await User.find({ role: 'admin' });
    res.render('userpage/admin', { user: req.user, tutors, students, admins });
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
  try {
    const { fullname, email, role, password } = req.body;

    // Tìm user hiện tại
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('Người dùng không tồn tại');
    }

    // Cập nhật các trường
    user.fullname = fullname;
    user.email = email;
    user.role = role;

    // Nếu mật khẩu được nhập, thì hash và cập nhật
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();
    res.redirect('/userpage/admin');
  } catch (err) {
    console.error('Lỗi khi cập nhật người dùng:', err);
    res.status(500).send('Lỗi server khi cập nhật người dùng');
  }
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