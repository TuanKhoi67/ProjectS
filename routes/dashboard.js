const express = require('express');
const router = express.Router();
const Document = require("../models/Document");
const User = require("../models/Users");
const Student = require("../models/Student");
const Tutor = require("../models/Tutor");
const mongoose = require("mongoose");
const Blog = require("../models/Blog");

// Add authentication middleware
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    req.user = req.session.user;
    res.render('dashboard', { user: req.user });
};


// Apply middleware to dashboard routes
router.get('/', isAuthenticated, (req, res) => {
    if (req.user.role === 'student') {
        res.render('dashboard/student', { user: req.user });
    } else if (req.user.role === 'tutor') {
        res.render('dashboard/tutor', { user: req.user });
    } else if (req.user.role === 'admin') {
        res.render('dashboard/admin', { user: req.user });
    } else {
        res.send('Dashboard không xác định');x
    }
});

// Student Dashboard
router.get('/student', async (req, res) => {
    res.render('dashboard/student', { user: req.user });
});
router.get('/student/:id', async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.params.id })
            .populate('tutor')
            .populate('user');

        const messages = await Message.find({
            $or: [
                { sender: req.params.id },
                { receiver: req.params.id }
            ]
        }).sort({ timestamp: -1 }).limit(5);

        const documents = await Document.find({
            'comments.user': req.params.id
        }).sort({ createdAt: -1 }).limit(5);

        const blogs = await Blog.find({
            author: req.params.id
        }).sort({ createdAt: -1 }).limit(5);

        res.render('dashboard/student', {
            student,
            messages,
            documents,
            blogs
        });
    } catch (error) {
        res.status(500).json({ message: "Error loading student dashboard" });
    }
});

// Tutor Dashboard
router.get('/tutor', async (req, res) => {
    res.render('dashboard/tutor', { user: req.user });
});
router.get('/tutor/:id', async (req, res) => {
    try {
        const tutor = await Tutor.findOne({ user: req.params.id })
            .populate('user');

        const students = await Student.find({ tutor: tutor._id })
            .populate('user');

        const recentMessages = await Message.find({
            sender: req.params.id
        }).sort({ timestamp: -1 }).limit(10);

        const studentActivities = await Blog.find({
            author: { $in: students.map(student => student.user._id) }
        }).sort({ createdAt: -1 }).limit(10);

        res.render('dashboard/tutor', {
            tutor,
            students,
            recentMessages,
            studentActivities
        });
    } catch (error) {
        res.status(500).json({ message: "Error loading tutor dashboard" });
    }
});

// Admin Dashboard

router.get('/admin', async (req, res) => {
    try {
        // Get all users with their roles
        const users = await User.find();

        // Get tutors with populated user info
        const tutors = await Tutor.find()
            .populate({
                path: 'user',
                select: 'name email'
            });
        console.log(tutors);

        // Get students with populated tutor and user info  
        const students = await Student.find()
            .populate({
                path: 'user',
                select: 'name email'
            })
            .populate({
                path: 'tutor',
                select: 'name department'
            });

        // Get recent activity
        const recentDocuments = await Document.find()
            .sort('-createdAt')
            .limit(5);

        const recentBlogs = await Blog.find()
            .sort('-createdAt')
            .limit(5);

        // Render with all data
        res.render('dashboard/admin', {
            users,
            tutors,
            students,
            recentDocuments,
            recentBlogs,
            stats: {
                totalUsers: users.length,
                totalTutors: tutors.length,
                totalStudents: students.length,
                totalDocuments: await Document.countDocuments(),
                totalBlogs: await Blog.countDocuments()
            }
        });

    } catch (error) {
        console.log('Admin dashboard error:', error);
        res.status(500).json({
            message: "Error loading admin dashboard",
            error: error.message
        });
        console.log(recentDocuments);
    }
});

// Hiển thị trang Usage Statistics
router.get('/usage', (req, res) => {
    res.render('dashboard/usage');
  });
  
  // Hiển thị trang User Activity
  router.get('/activity', (req, res) => {
    res.render('dashboard/activity');
  });
  
router.get('/students', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userId, text } = req.body;

        // Kiểm tra tài liệu có tồn tại không
        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Kiểm tra user có phải là student hoặc tutor không
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const student = await Student.findOne({ user: userId });
        const tutor = await Tutor.findOne({ user: userId });

        if (!student && !tutor) {
            return res.status(403).json({ message: "Only students and tutors can comment" });
        }

        // Thêm bình luận vào tài liệu
        document.comments.push({
            user: new mongoose.Types.ObjectId(userId),
            username: user.fullname,
            text,
            createdAt: new Date()
        });

        await document.save();

        res.status(201).json({ message: "Comment added successfully", document });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});





module.exports = router;