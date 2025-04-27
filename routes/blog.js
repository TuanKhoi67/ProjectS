const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { ensureAuthenticated, checkAdmin } = require('../middleware/auth');
const User = require('../models/Users');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const upload = require('../config/upload');

// Route to display all blogs
router.get('/', ensureAuthenticated, checkAdmin, async (req, res) => {
    try {
        const blogs = await Blog.find().populate('author', 'fullname role');
        res.render('blog/index', { blogs, user: req.user }); // Gửi user vào view
    } catch (error) {
        console.error('Error retrieving blog list:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to create a new blog
router.post('/', upload.single('imageFile'), async (req, res) => {
    try {
        const { title, content, imageUrl } = req.body;
        const role = req.user.role;

        if (!title || !content) {
            return res.status(400).send('Please fill in all required fields');
        }

        let imagePath = '';
        if (req.file) {
            imagePath = '/images/' + req.file.filename; // Chỉ giữ "images/"
        } else if (imageUrl) {
            imagePath = imageUrl;
        }

        const blog = new Blog({
            title,
            content,
            image: imagePath,
            author: req.user._id,
            role
        });

        await blog.save();
        res.redirect(role === 'student' ? '/blog/student' : '/blog/tutor');
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});


// Route to display blogs created by the logged-in student
router.get('/student', ensureAuthenticated, async (req, res) => {
    try {
        const blogs = await Blog.find({
            role: 'student',
            author: req.user._id
        }).populate('author');

        const student = await Student.findOne({ user: req.user._id });
        res.render('userpage/student', { blogs, user: req.user, student });
    } catch (error) {
        console.error('Error fetching student blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display blogs by the logged-in tutor
router.get('/tutor', async (req, res) => {
    try {
        const blogs = await Blog.find({ role: 'tutor', author: req.user._id }).populate('author');

        const tutor = await Tutor.findOne({ user: req.user._id });
        res.render('userpage/tutor', { blogs, user: req.user, tutor });
    } catch (error) {
        console.error('Error fetching tutor blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display the edit form for a blog post
router.get('/edit/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        console.log("Blog data:", blog); // Kiểm tra dữ liệu blog có thuộc tính image không

        res.render('blog/edit', { blog });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle the update of a blog post
router.post('/edit/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const blogId = req.params.id;
        const { title, content, imageUrl } = req.body;

        let imagePath = '';

        // Xử lý ảnh
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        } else if (imageUrl) {
            imagePath = imageUrl;
        }

        // Giữ nguyên ảnh cũ nếu không có thay đổi
        const currentBlog = await Blog.findById(blogId);
        if (!imagePath && currentBlog.image) {
            imagePath = currentBlog.image;
        }

        await Blog.findByIdAndUpdate(blogId, {
            title,
            content,
            image: imagePath
        });

        res.redirect('/blog');
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle the deletion of a blog post
router.post('/delete/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        await Blog.findByIdAndDelete(blogId);
        res.redirect('/blog'); // Redirect to the blog list page after deleting
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        const blogs = await Blog.find({
            $or: [
                { title: { $regex: query, $options: 'i' } }
            ]
        }).populate('author');


        res.render('blog/index', { blogs });

    } catch (error) {
        console.error('Error searching blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/reel', async (req, res) => {
    try {
        let blogs = await Blog.find()
            .populate('author', 'fullname role')
            .populate({
                path: 'comments.user',
                select: 'fullname role'
            });

        const userId = req.user ? req.user._id.toString() : null;

        let userAvatar = '/images/default.jpg';

        if (req.user) {
            if (req.user.role === 'student') {
                const student = await Student.findOne({ user: req.user._id });
                userAvatar = student?.imageStudent || '/images/default.jpg';
            } else if (req.user.role === 'tutor') {
                const tutor = await Tutor.findOne({ user: req.user._id });
                userAvatar = tutor?.imageTutor || '/images/default.jpg';
            }
        }

        for (let blog of blogs) {
            // Nếu author không tồn tại
            if (!blog.author || !blog.author.role) {
                blog.avatar = 'https://placehold.co/45x45';
            } else if (blog.author.role === 'student') {
                const student = await Student.findOne({ user: blog.author._id });
                blog.avatar = student?.imageStudent || 'https://placehold.co/45x45';
            } else if (blog.author.role === 'tutor') {
                const tutor = await Tutor.findOne({ user: blog.author._id });
                blog.avatar = tutor?.imageTutor || 'https://placehold.co/45x45';
            } else {
                blog.avatar = 'https://placehold.co/45x45';
            }
        
            // Kiểm tra like
            blog.isLiked = userId && blog.likedBy.some(id => id.toString() === userId);
        
            // Duyệt qua các comment và gắn avatar
            for (let comment of blog.comments) {
                if (!comment.user || !comment.user.role) {
                    comment.avatar = 'https://placehold.co/45x45';
                } else if (comment.user.role === 'student') {
                    const student = await Student.findOne({ user: comment.user._id });
                    comment.avatar = student?.imageStudent || 'https://placehold.co/45x45';
                } else if (comment.user.role === 'tutor') {
                    const tutor = await Tutor.findOne({ user: comment.user._id });
                    comment.avatar = tutor?.imageTutor || 'https://placehold.co/45x45';
                } else {
                    comment.avatar = 'https://placehold.co/45x45';
                }
            }
        }
        
        res.render('blog/reel', {
            blogs,
            user: req.user,
            userAvatar
        });

    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/like/:id', ensureAuthenticated, async (req, res) => {
    try {
        const blogId = req.params.id;
        const userId = req.user._id;
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).json({ error: 'Blog does not exist!' });
        }

        const index = blog.likedBy.indexOf(userId);
        if (index === -1) {
            blog.likedBy.push(userId);
            blog.likes += 1;
        } else {
            blog.likedBy.splice(index, 1);
            blog.likes -= 1;
        }

        await blog.save();
        res.json({
            success: true,
            likes: blog.likes,
            isLiked: index === -1 // Correctly calculate the new liked state
        });
    } catch (error) {
        console.error('Error liking:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/reel/comment/:id', ensureAuthenticated, async (req, res) => {
    try {
        console.log(req.user); // Kiểm tra user đăng nhập

        const blogId = req.params.id;
        const user = req.user;
        const { content } = req.body;

        if (!user) {
            return res.status(401).send('You need to log in to comment!');
        }

        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).send('Blog does not exist!');
        }

        const comment = {
            user: user._id, // Lưu ID của user
            content
        };

        blog.comments.push(comment);
        await blog.save();

        res.redirect('/blog/reel');
    } catch (error) {
        console.error('Error commenting:', error);
        res.status(500).send('Internal Server Error!');
    }
});

module.exports = router;
