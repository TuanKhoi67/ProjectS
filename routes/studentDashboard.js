const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/student_dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.user._id })
            .populate('author', 'fullname')
            .populate({
                path: 'comments.user',
                select: 'fullname'
            });

        // Biểu đồ 1: blog của chính user
        const totalBlogs = blogs.length;
        const totalLikes = blogs.reduce((acc, blog) => acc + (blog.likes || 0), 0);
        const totalComments = blogs.reduce((acc, blog) => acc + (blog.comments.length || 0), 0);

        // Biểu đồ 2: user đã tương tác với blog người khác
        const likedBlogs = await Blog.find({ likedBy: req.user._id });
        const commentedBlogs = await Blog.find({ 'comments.user': req.user._id });

        res.render('dashboard/studentDashboard', {
            title: 'Student Dashboard',
            studentName: req.user.fullname,
            blogs,
            chartData: {
                totalBlogs,
                totalLikes,
                totalComments,
                likedCount: likedBlogs.length,
                commentedCount: commentedBlogs.length
            }
        });
    } catch (error) {
        console.error('Lỗi lấy bài blog:', error);
        res.status(500).send('Lỗi máy chủ');
    }
});


module.exports = router;
