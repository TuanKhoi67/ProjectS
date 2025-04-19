const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const Tutor = require('../models/Tutor');
const Student = require('../models/Student');
const upload = require('../config/upload');


// Xem profile
router.get('/', async (req, res) => {
    try {
        const user = req.user; 

        let tutor, student;
        if (user.role === 'tutor') {
            tutor = await Tutor.findOne({ user: user._id });
        } else if (user.role === 'student') {
            student = await Student.findOne({ user: user._id });
        }

        res.render('profile/index', {
            user: user,
            role: user.role,
            tutor: tutor,
            student: student
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Edit profile
router.get('/edit', async (req, res) => {
    try {
        const user = req.user;

        let profileData;
        if (user.role === 'tutor') {
            profileData = await Tutor.findOne({ user: user._id }) || {};
        } else if (user.role === 'student') {
            profileData = await Student.findOne({ user: user._id }) || {};
        }

        res.render('profile/edit', {
            user: user,
            role: user.role,
            profileData: profileData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update profile
router.post('/edit', upload.single('avatar'),async (req, res) => {
    try {
        const user = req.user;
        const { telephone, department, subject } = req.body;

        // Xử lý ảnh đại diện
        let imagePath = null;
        if (req.file) {
            imagePath = '/images/' + req.file.filename; // Lưu đường dẫn tương đối

            // Xóa ảnh cũ nếu có
            if (user.role === 'tutor' && user.tutor?.imageTutor && user.tutor.imageTutor !== 'default.jpg') {
                const oldImagePath = path.join(__dirname, '../public', user.tutor.imageTutor);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            } else if (user.role === 'student' && user.student?.imageStudent && user.student.imageStudent !== 'default.jpg') {
                const oldImagePath = path.join(__dirname, '../public', user.student.imageStudent);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
        }

        if (user.role === 'tutor') {
            const updateData = {
                name: user.fullname,
                email: user.email,
                telephone,
                department,
                user: user._id
            };

            if (req.file) updateData.imageTutor = imagePath;

            await Tutor.findOneAndUpdate(
                { user: user._id },
                updateData,
                { upsert: true, new: true }
            );
        } else if (user.role === 'student') {
            const updateData = {
                name: user.fullname,
                email: user.email,
                telephone,
                subject,
                user: user._id
            };

            if (req.file) updateData.imageStudent = imagePath;

            await Student.findOneAndUpdate(
                { user: user._id },
                updateData,
                { upsert: true, new: true }
            );
        }

        res.redirect('/profile');
    } catch (err) {
        console.error(err);

        // Xóa file vừa upload nếu có lỗi
        if (req.file) {
            const filePath = path.join(__dirname, '../public/images/', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.status(500).render('error', {
            message: 'Đã có lỗi xảy ra khi cập nhật thông tin',
            error: err.message
        });
    }
});

module.exports = router;