const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Blog = require('../models/Blog');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const User = require('../models/Users');
const { ensureAuthenticated } = require('../middleware/auth');
const moment = require('moment');

router.get('/tutor_dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const tutorId = req.user._id;

    // Original: Count documents & comments
    const documents = await Document.find({ author: tutorId });
    const documentCount = documents.length;
    const totalComments = documents.reduce((sum, doc) => {
      return sum + (doc.comments ? doc.comments.length : 0);
    }, 0);

    // Enhanced: Find students the tutor has interacted with
    const messageSenders = await Message.find({ receiver: tutorId }).distinct('sender');
    const meetingStudents = await Meeting.find({ tutor: tutorId }).distinct('student');
    const tuteeIds = [...new Set([...messageSenders, ...meetingStudents])];

    const tutees = await User.find({ _id: { $in: tuteeIds }, role: 'student' });

    // Summary stats
    const messages = await Message.find({ sender: { $in: tuteeIds }, receiver: tutorId });
    const meetings = await Meeting.find({ student: { $in: tuteeIds }, tutor: tutorId });

    const messagesThisWeek = messages.filter(m => moment(m.createdAt).isAfter(moment().subtract(7, 'days')));

    const summary = {
      totalTutees: tutees.length,
      messagesThisWeek: messagesThisWeek.length,
      meetingsHeld: meetings.length,
      documentsShared: documents.length
    };

    // Tutee activity list
    const tuteeData = await Promise.all(tutees.map(async (t) => {
      const lastMsg = await Message.findOne({ sender: t._id }).sort({ createdAt: -1 });
      const lastMeeting = await Meeting.findOne({ student: t._id }).sort({ startTime: -1 });

      let lastActive;
      if (lastMsg && lastMeeting) {
        lastActive = moment.max(moment(lastMsg.createdAt), moment(lastMeeting.startTime)).fromNow();
      } else if (lastMsg) {
        lastActive = moment(lastMsg.createdAt).fromNow();
      } else if (lastMeeting) {
        lastActive = moment(lastMeeting.startTime).fromNow();
      } else {
        lastActive = 'No activity';
      }

      const messageCount = await Message.countDocuments({ sender: t._id });
      const meetingCount = await Meeting.countDocuments({ student: t._id });
      const documentCount = await Document.countDocuments({ author: t._id });

      return {
        fullname: t.fullname,
        email: t.email,
        lastActive,
        messageCount,
        meetingCount,
        documentCount
      };
    }));

    // Exception reports
    const inactive7 = tuteeData.filter(t => t.lastActive === 'No activity' || moment().diff(moment(t.lastActive), 'days') >= 7).length;
    const inactive28 = tuteeData.filter(t => t.lastActive === 'No activity' || moment().diff(moment(t.lastActive), 'days') >= 28).length;

    // Example: dummy classes (replace with real logic later)
    const classes = [
      { name: 'SE Practice', subject: 'Software Engineering', studentCount: 25 },
      { name: 'AI Basics', subject: 'Artificial Intelligence', studentCount: 18 }
    ];

    res.render('dashboard/tutorDashboard', {
      tutor: req.user,
      documentCount,
      totalComments,
      summary,
      tutees: tuteeData,
      exceptions: { inactive7, inactive28 },
      classes
    });

  } catch (error) {
    console.error('❌ Lỗi khi tải dashboard tutor:', error);
    res.status(500).send('Lỗi server khi lấy dữ liệu dashboard.');
  }
});

module.exports = router;