const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { ensureAuthenticated, checkAdmin } = require('../middleware/auth'); 
const User = require('../models/Users'); 
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const upload = require('../config/upload');

// Route to display all blogs
router.get('/', ensureAuthenticated ,checkAdmin, async (req, res) => {
    try {
        const blogs = await Blog.find().populate('author', 'fullname role');
        res.render('blog/index', { blogs, user: req.user }); // Gửi user vào view
    } catch (error) {
        console.error('Lỗi lấy danh sách bài viết:', error);
        res.status(500).send('Lỗi máy chủ');
    }
});

// Route to create a new blog
router.post('/', upload.single('imageFile'), async (req, res) => {
    try {
        const { title, content, imageUrl } = req.body;
        const role = req.user.role;

        if (!title || !content) {
            return res.status(400).send('Vui lòng điền đầy đủ các trường bắt buộc');
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
        console.error('Lỗi khi tạo bài viết:', error);
        res.status(500).send('Lỗi máy chủ: ' + error.message);
    }
});


// Route to display blogs created by the logged-in student
router.get('/student', ensureAuthenticated, async (req, res) => {
    try {
        const blogs = await Blog.find({ 
            role: 'student', 
            author: req.user._id 
        }).populate('author');

        res.render('userpage/student', { blogs, user: req.user });
    } catch (error) {
        console.error('Error fetching student blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display blogs by the logged-in tutor
router.get('/tutor', async (req, res) => {
    try {
        const blogs = await Blog.find({ role: 'tutor', author: req.user._id }).populate('author');
        res.render('userpage/tutor', { blogs, user: req.user });
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
        console.error('Lỗi khi cập nhật blog:', error);
        res.status(500).send('Lỗi máy chủ');
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
        const blogs = await Blog.find()
            .populate('author', 'fullname role')
            .populate({
                path: 'comments.user',
                select: 'fullname profilePicture'
            });

        const userId = req.user ? req.user._id.toString() : null;

        for (let blog of blogs) {
            if (blog.author.role === 'student') {
                const student = await Student.findOne({ user: blog.author._id });
                blog.avatar = student?.imageStudent || '/images/default.jpg';
            } else if (blog.author.role === 'tutor') {
                const tutor = await Tutor.findOne({ user: blog.author._id });
                blog.avatar = tutor?.imageTutor || '/images/default.jpg';
            } else {
                blog.avatar = '/images/default.jpg';
            }

            blog.isLiked = userId && blog.likedBy.some(id => id.toString() === userId);
            for (let comment of blog.comments) {
                if (comment.user && comment.user.role === 'student') {
                    const student = await Student.findOne({ user: comment.user._id });
                    comment.avatar = student?.imageStudent || '/images/default.jpg';
                } else if (comment.user && comment.user.role === 'tutor') {
                    const tutor = await Tutor.findOne({ user: comment.user._id });
                    comment.avatar = tutor?.imageTutor || '/images/default.jpg';
                } else {
                    comment.avatar = '/images/default.jpg';
                }
            }
        }

        res.render('blog/reel', { blogs, user: req.user });
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
            return res.status(404).json({ error: 'Bài viết không tồn tại' });
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
        console.error('Lỗi khi thả tim:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

router.post('/reel/comment/:id', ensureAuthenticated, async (req, res) => {
    try {
        console.log(req.user); // Kiểm tra user đăng nhập
  
        const blogId = req.params.id;
        const user = req.user; 
        const { content } = req.body; 
  
        if (!user) {
            return res.status(401).send('Bạn cần đăng nhập để bình luận!');
        }
  
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).send('Bài viết không tồn tại!');
        }
  
        const comment = {
            user: user._id, // Lưu ID của user
            content
        };
  
        blog.comments.push(comment);
        await blog.save();
  
        res.redirect('/blog/reel');
    } catch (error) {
        console.error('Lỗi khi bình luận:', error);
        res.status(500).send('Lỗi máy chủ!');
    }
  });

module.exports = router;
