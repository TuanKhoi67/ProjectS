const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const Document = require('../models/Document');
var ClassModel = require('../models/Class');
const User = require('../models/Users');
const Student = require('../models/Student');
const { ensureAuthenticated } = require('../middleware/auth');


router.get('/student_dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const studentId = req.user._id;
        const student = await Student.findOne({ user: studentId });

        const userBlogs = await Blog.find({ author: studentId })
            .sort({ createdAt: -1 })
            .populate('author', 'fullname image');

        const messages = await Message.find({ receiver: studentId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sender', 'fullname image');

        const studentClasses = await ClassModel.find({ student: student._id })
            .populate('student')
            .populate('tutor')
            .sort({ createDate: -1 });
        console.log("Classes found:", studentClasses);

        if (!studentClasses.length) {
            return res.render('dashboard/studentDashboard', {
                classes: [],
                error: 'Bạn chưa tham gia lớp học nào.'
            });
        }

        const meetings = await Meeting.find({ student: student._id })
        .populate('student', 'name')
        .populate('tutor', 'name')
        .sort({ startTime: 1 })
        .lean();


        // Chuẩn bị dữ liệu cho biểu đồ
        const chartData = userBlogs.map(blog => ({
            title: blog.title,
            likes: blog.likes,
            comments: blog.comments.length
        }));

        res.render('dashboard/studentDashboard', {
            user: req.user,
            student,
            blogs: userBlogs,
            messages,
            classes: studentClasses,
            meetings,
            chartData: JSON.stringify(chartData),
            error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});


module.exports = router;
