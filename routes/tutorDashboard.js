const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Blog = require('../models/Blog');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const User = require('../models/Users');
const Tutor = require('../models/Tutor');
const ClassModel = require('../models/Class');
const { ensureAuthenticated } = require('../middleware/auth');


router.get('/tutor_dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const tutorId = req.user._id;

    const tutor = await Tutor.findOne({ user: tutorId });

    if (!tutor) {
      return res.render('dashboard/tutorDashboard', {
        error: 'Không tìm thấy thông tin tutor.',
        documents: []
      });
    }

    const documents = await Document.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .populate('author', 'fullname');

    const messages = await Message.find({ receiver: tutorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'fullname image')
      .lean();

    const tutorClasses = await ClassModel.find({ tutor: tutor._id })
      .populate('student')
      .populate('tutor')
      .lean();

    const meetings = await Meeting.find({ tutor: tutor._id })
            .populate('student', 'name')
            .populate('tutor', 'name')
            .sort({ startTime: 1 })
            .lean();


    res.render('dashboard/tutorDashboard', {
      user: req.user,
      tutor,
      documents,
      messages,
      classes: tutorClasses,
      meetings,
      error: null
    });
  } catch (error) {
    console.error('❌ Lỗi khi tải dashboard tutor:', error);
    res.status(500).send('Lỗi server khi lấy dữ liệu dashboard.');
  }
});


module.exports = router;
