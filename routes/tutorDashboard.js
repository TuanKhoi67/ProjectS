const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Blog = require('../models/Blog');
const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const User = require('../models/Users');
const Tutor = require('../models/Tutor');
const Student = require('../models/Student');
const ClassModel = require('../models/Class');
const { ensureAuthenticated } = require('../middleware/auth');
const moment = require('moment');

router.get('/tutor_dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const tutorId = req.user._id;
    const tutor = await Tutor.findOne({ user: tutorId }).lean();

    if (!tutor) {
      return res.render('dashboard/tutorDashboard', {
        error: 'Tutor profile not found.',
        documents: []
      });
    }

    // Documents
    const documents = await Document.find({ author: tutorId })
      .sort({ createdAt: -1 })
      .populate('author', 'fullname')
      .lean();

    const documentCount = documents.length;
    const totalComments = documents.reduce((sum, doc) => sum + (doc.comments?.length || 0), 0);

    const answeredDocsCount = await Document.countDocuments({
      author: tutorId,
      comments: { $exists: true, $not: { $size: 0 } }
    });

    // Recent Messages
    const messages = await Message.find({ receiver: tutorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'fullname image')
      .lean();

    // Classes managed by tutor
    const tutorClasses = await ClassModel.find({ tutor: tutor._id })
      .populate('student')
      .populate('tutor')
      .lean();

    // Meetings
    const meetings = await Meeting.find({ tutor: tutor._id })
      .populate('student', 'name')
      .populate('tutor', 'name')
      .sort({ startTime: 1 })
      .lean();

    // Tutee interaction overview
    const messageSenders = await Message.find({ receiver: tutorId }).distinct('sender');
    const meetingStudents = await Meeting.find({ tutor: tutor._id }).distinct('student');
    const tuteeIds = [...new Set([...messageSenders, ...meetingStudents])];

    const tutees = await User.find({ _id: { $in: tuteeIds }, role: 'student' }).lean();

    const messagesThisWeek = await Message.countDocuments({
      sender: { $in: tuteeIds },
      receiver: tutorId,
      createdAt: { $gte: moment().subtract(7, 'days').toDate() }
    });

    const summary = {
      totalTutees: tutees.length,
      messagesThisWeek,
      meetingsHeld: meetings.length,
      documentsShared: documentCount
    };

    // Build tutee data for table & chart
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
      const docCount = await Document.countDocuments({ author: t._id });

      return {
        _id: t._id,
        fullname: t.fullname,
        email: t.email,
        lastActive,
        lastActiveDate: lastActiveDate || null,
        messageCount,
        meetingCount,
        documentCount: docCount
      };
    }));

    // Exception reporting
    const inactive7 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 7).length;
    const inactive28 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 28).length;

    res.render('dashboard/tutorDashboard', {
      tutorName: req.user.fullname,
      tutor,
      documents,
      documentCount,
      totalComments,
      answeredDocsCount,
      messages,
      tutorClasses,
      meetings,
      summary,
      tutees: tuteeData,
      exceptions: { inactive7, inactive28 }
    });
  } catch (error) {
    console.error('❌ Error loading tutor dashboard:', error);
    res.status(500).send('Server error while fetching dashboard data.');
  }
});

module.exports = router;
