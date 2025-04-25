const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const Document = require('../models/Document');
var ClassModel = require('../models/Class');
const User = require('../models/Users');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
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
            .populate('sender', 'fullname image')
            .populate('receiver', 'fullname image')
            .populate('sender receiver', 'fullname').lean();

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

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const blogsThisMonth = await Blog.find({
            author: studentId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        const totalBlogsThisMonth = blogsThisMonth.length;
        let totalLikesThisMonth = 0;
        let totalCommentsThisMonth = 0;

        blogsThisMonth.forEach(blog => {
            totalLikesThisMonth += blog.likes || 0;
            totalCommentsThisMonth += blog.comments?.length || 0;
        });

        const attendanceStats = [];

        for (const classItem of studentClasses) {
            const studentsInClass = classItem.student.map(s => s._id.toString());

            if (studentsInClass.includes(student._id.toString())) {
                const presentCount = await Attendance.countDocuments({
                    student_id: student._id,
                    status: 'present'
                });

                const absentCount = await Attendance.countDocuments({
                    student_id: student._id,
                    status: 'absent'
                });

                attendanceStats.push({
                    className: classItem.name || 'Lớp không tên',
                    present: presentCount,
                    absent: absentCount
                });
            }
        }

        res.render('dashboard/studentDashboard', {
            user: req.user,
            student,
            blogs: userBlogs,
            messages,
            classes: studentClasses,
            meetings,
            totalBlogsThisMonth,
            totalLikesThisMonth,
            totalCommentsThisMonth,
            attendanceStats,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});


module.exports = router;
