const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/Users');
const Tutor = require('../models/Tutor');
const Student = require('../models/Student');
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated, checkAdmin, checkStudent, checkTutor } = require('../middleware/auth');

// Configure Multer to store files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads/'); // Specify the folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Name the file with the current timestamp
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/; // Restrict to PDF and Word files only
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, and DOCX files are accepted'));
  }
});

// Display the document management page
router.get('/', checkAdmin, async (req, res) => {
  try {
    const documents = await Document.find().populate('author', 'fullname');
    res.render('document/index', { documents }); // Return the document management page with data
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while fetching document list');
  }
});

// Display the add document page
router.get('/add', (req, res) => {
  res.render('document/add');
});

// Handle adding a document
router.post('/add', upload.single('documentFile'), async (req, res) => {
  const { title, author, content } = req.body;
  const documentFile = req.file ? '/uploads/' + req.file.filename : '';

  const newDocument = new Document({
    title,
    author: req.user._id,
    content,
    imageUrl: req.body.imageUrl, // If there is an image
    documentFile // Add the uploaded file
  });

  await newDocument.save();
  res.redirect('/document/mainDocument');
});

// Handle document search
router.get('/search', async (req, res) => {
  const query = req.query.query || '';
  try {
    const documents = await Document.find({
      title: { $regex: query, $options: 'i' } // Case-insensitive search
    }).populate('author'); // Adjust based on your schema
    res.json({ documents }); // Return JSON response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Edit document route
router.get('/edit/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await Document.findById(documentId).populate('author', 'fullname');

    if (!document) {
      return res.status(404).send('Document not found');
    }

    res.render('document/edit', { document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update document route
router.post('/update/:id', upload.single('documentFile'), async (req, res) => {
  try {
    const documentId = req.params.id;
    const { title, content, imageUrl } = req.body;

    let documentFileUrl = null;
    if (req.file) {
      documentFileUrl = `/uploads/${req.file.filename}`;
    }

    const updateData = {
      title,
      content,
      imageUrl
    };

    if (documentFileUrl) {
      updateData.documentFile = documentFileUrl;
    }

    await Document.findByIdAndUpdate(documentId, updateData);

    res.redirect('/document');
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle deleting a document with POST method
router.delete('/delete/:id', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.redirect('/document');
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Display the document list page with comments
router.get('/mainDocument', async (req, res) => {
  try {
    const documents = await Document.find()
      .populate({
        path: 'author',
        select: 'fullname role', // Need role to determine if tutor/student
      })
      .populate({
        path: 'comments.user',
        select: 'fullname role',
      })
      .lean(); // Easier to process additional data

    // Loop through documents to attach avatar from student/tutor
    for (let doc of documents) {
      doc.avatar = await getUserAvatar(doc.author);

      for (let comment of doc.comments) {
        comment.avatar = await getUserAvatar(comment.user);
      }
    }

    // Attach avatar for the current user if logged in
    let currentUserAvatar = null;
    if (req.user) {
      currentUserAvatar = await getUserAvatar(req.user);
    }

    res.render('document/mainDocument', {
      documents,
      user: req.user,
      userAvatar: currentUserAvatar,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// Add a comment to a document (only logged-in users can comment)
router.post('/comment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.id;
    const user = req.user; // Assuming you have user authentication
    const { text } = req.body;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const comment = {
      username: user.fullname, // Use the fullname of the user
      text
    };
    document.comments.push(comment);
    await document.save();

    res.redirect('/document/mainDocument'); // Reload the page
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Server error');
  }
});

async function getUserAvatar(user) {
  if (!user || !user._id) return 'https://placehold.co/45x45';

  try {
    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id });
      return student?.imageStudent || 'https://placehold.co/45x45';
    } else if (user.role === 'tutor') {
      const tutor = await Tutor.findOne({ user: user._id });
      return tutor?.imageTutor || 'https://placehold.co/45x45';
    } else {
      return 'https://placehold.co/45x45';
    }
  } catch (err) {
    console.error('Error fetching avatar:', err);
    return 'https://placehold.co/45x45';
  }
}

module.exports = router;
