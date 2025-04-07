const express = require('express');
const router = express.Router();
const User = require('../models/Users'); // Model User
const Student = require('../models/Student'); // Model Student
const Tutor = require('../models/Tutor'); // Model Tutor

// Middleware kiểm tra đăng nhập (Giả sử có session lưu userId)
// const isAuthenticated = (req, res, next) => {
//     if (!req.session.userId) {
//         return res.redirect('/auth/login'); // Chưa đăng nhập thì chuyển hướng về login
//     }
//     res.render('profile'); // Đã đăng nhập thì chuyển hướng về profile
// };

router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        let profileData = {};
        if (user.role === 'student') {
            profileData = await Student.findOne({ user: user._id });
        } else if (user.role === 'tutor') {
            profileData = await Tutor.findOne({ user: user._id });
        }

        res.render('profile/index', { user, profileData });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

router.get('/edit', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        let profileData = {};
        if (user.role === 'student') {
            profileData = await Student.findOne({ user: user._id });
        } else if (user.role === 'tutor') {
            profileData = await Tutor.findOne({ user: user._id });
        }

        res.render('profile/edit', { user, profileData });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Xử lý cập nhật thông tin
router.post('/edit', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');

        if (user.role === 'student') {
            await Student.findOneAndUpdate({ user: user._id }, req.body);
        } else if (user.role === 'tutor') {
            await Tutor.findOneAndUpdate({ user: user._id }, req.body);
        }

        res.redirect('/profile'); // Sau khi sửa xong quay về profile
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
