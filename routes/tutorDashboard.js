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

    // Count tutor's documents & comments
    const documents = await Document.find({ author: tutorId });
    const documentCount = documents.length;
    const totalComments = documents.reduce((sum, doc) => sum + (doc.comments?.length || 0), 0);

    // Find students the tutor interacted with
    const messageSenders = await Message.find({ receiver: tutorId }).distinct('sender');
    const meetingStudents = await Meeting.find({ tutor: tutorId }).distinct('student');
    const tuteeIds = [...new Set([...messageSenders, ...meetingStudents])];

    const tutees = await User.find({ _id: { $in: tuteeIds }, role: 'student' });

    // Get all messages and meetings from those students
    const messages = await Message.find({ sender: { $in: tuteeIds }, receiver: tutorId });
    const meetings = await Meeting.find({ student: { $in: tuteeIds }, tutor: tutorId });

    const messagesThisWeek = messages.filter(m => moment(m.createdAt).isAfter(moment().subtract(7, 'days')));

    const summary = {
      totalTutees: tutees.length,
      messagesThisWeek: messagesThisWeek.length,
      meetingsHeld: meetings.length,
      documentsShared: documents.length
    };

    // Build tutee activity data
    const tuteeData = await Promise.all(tutees.map(async (t) => {
      const lastMsg = await Message.findOne({ sender: t._id }).sort({ createdAt: -1 });
      const lastMeeting = await Meeting.findOne({ student: t._id }).sort({ startTime: -1 });

      let lastActiveDate;
      if (lastMsg && lastMeeting) {
        lastActiveDate = moment.max(moment(lastMsg.createdAt), moment(lastMeeting.startTime));
      } else if (lastMsg) {
        lastActiveDate = moment(lastMsg.createdAt);
      } else if (lastMeeting) {
        lastActiveDate = moment(lastMeeting.startTime);
      }

      const lastActive = lastActiveDate ? lastActiveDate.fromNow() : 'No activity';

      const messageCount = await Message.countDocuments({ sender: t._id });
      const meetingCount = await Meeting.countDocuments({ student: t._id });
      const documentCount = await Document.countDocuments({ author: t._id });

      return {
        _id: t._id,
        fullname: t.fullname,
        email: t.email,
        lastActive,
        lastActiveDate: lastActiveDate || null,
        messageCount,
        meetingCount,
        documentCount
      };
    }));

    // Exception reporting
    const inactive7 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 7).length;
    const inactive28 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 28).length;

    // Dummy classes for now
    const classes = [
      { _id: 'class1', name: 'SE Practice', subject: 'Software Engineering', studentCount: 25 },
      { _id: 'class2', name: 'AI Basics', subject: 'Artificial Intelligence', studentCount: 18 }
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