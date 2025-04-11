const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const User = require('../models/Users'); // Adjust the path to your User model

// Route to display all blogs
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find().populate('author');
        res.render('blog/index', { blogs });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to create a new blog
router.post('/', async (req, res) => {
  try {
      const { title, content, role } = req.body;
      const blog = new Blog({
          title,
          content,
          author: req.user._id, // Assuming you have user authentication
          role
      });
      await blog.save();
      res.redirect(role === 'student' ? '/blog/student' : '/blog/tutor');
  } catch (error) {
      console.error('Error creating blog:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Route to display blogs for students
router.get('/student', async (req, res) => {
  try {
      const blogs = await Blog.find({ role: 'student' }).populate('author');
      res.render('userpage/student', { blogs });
  } catch (error) {
      console.error('Error fetching student blogs:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Route to display blogs for tutors
router.get('/tutor', async (req, res) => {
    try {
        const blogs = await Blog.find({ role: 'tutor' }).populate('author');
        res.render('userpage/tutor', { blogs });
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

        res.render('blog/edit', { blog });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Route to handle the update of a blog post
router.post('/edit/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        const { title, content } = req.body;

        await Blog.findByIdAndUpdate(blogId, {
            title,
            content
        });

        res.redirect('/blog'); // Redirect to the blog list page after updating
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


module.exports = router;