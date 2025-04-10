const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Document = require('../models/Document');
const Meeting = require('../models/Meeting');
const Message = require('../models/Message');
const { ensureAuthenticated } = require('../middleware/auth');
const moment = require('moment');

router.get('/student_dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const studentId = req.user._id;

        // Blog data
        const blogs = await Blog.find({ author: studentId })
            .populate('comments.user', 'fullname');

        const totalBlogs = blogs.length;
        const totalLikes = blogs.reduce((acc, blog) => acc + (blog.likes || 0), 0);
        const totalComments = blogs.reduce((acc, blog) => acc + (blog.comments.length || 0), 0);

        const likedBlogs = await Blog.find({ likedBy: studentId });
        const commentedBlogs = await Blog.find({ 'comments.user': studentId });

        // Messages
        const recentMessages = await Message.find({ receiver: studentId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sender', 'fullname');

        // Meetings
        const meetings = await Meeting.find({ student: studentId })
            .sort({ startTime: -1 })
            .limit(5)
            .populate('tutor', 'fullname');

        // Documents
        const documents = await Document.find({ author: studentId });

        // Weekly activity
        const today = moment().startOf('day');
        const pastWeek = [...Array(7).keys()].map(i =>
            today.clone().subtract(i, 'days').format('YYYY-MM-DD')
        );
        const weeklyActivity = {};
        pastWeek.reverse().forEach(date => weeklyActivity[date] = { blogs: 0, messages: 0, comments: 0 });

        blogs.forEach(blog => {
            const date = moment(blog.createdAt).format('YYYY-MM-DD');
            if (weeklyActivity[date]) weeklyActivity[date].blogs += 1;
            blog.comments.forEach(comment => {
                const cDate = moment(comment.createdAt).format('YYYY-MM-DD');
                if (weeklyActivity[cDate]) weeklyActivity[cDate].comments += 1;
            });
        });

        const messages = await Message.find({ receiver: studentId });
        messages.forEach(msg => {
            const msgDate = moment(msg.createdAt).format('YYYY-MM-DD');
            if (weeklyActivity[msgDate]) weeklyActivity[msgDate].messages += 1;
        });

        // Document type breakdown
        const fileTypes = { pdf: 0, word: 0, image: 0, other: 0 };
        documents.forEach(doc => {
            const ext = (doc.documentFile || doc.imageUrl || '').split('.').pop()?.toLowerCase();
            if (ext === 'pdf') fileTypes.pdf++;
            else if (['doc', 'docx'].includes(ext)) fileTypes.word++;
            else if (['jpg', 'jpeg', 'png'].includes(ext)) fileTypes.image++;
            else fileTypes.other++;
        });

        res.render('dashboard/studentDashboard', {
            studentName: req.user.fullname,
            blogs,
            recentMessages,
            meetings,
            documents,
            chartData: {
                totalBlogs,
                totalLikes,
                totalComments,
                likedCount: likedBlogs.length,
                commentedCount: commentedBlogs.length,
                weeklyActivity,
                fileTypes
            }
        });
    } catch (error) {
        console.error('Error fetching student dashboard data:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
