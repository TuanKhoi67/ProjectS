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
      // Render an error page or display a message if the tutor profile is not found
      return res.render('dashboard/tutorDashboard', {
        error: 'Tutor profile not found. Please update your profile to access the dashboard.',
        tutorName: req.user.fullname, // Pass the user's name for context
        documents: [],
        blogs: [],
        messages: [],
        tutorClasses: [],
        meetings: [],
        summary: {
          totalTutees: 0,
          messagesThisWeek: 0,
          meetingsHeld: 0,
          documentsShared: 0
        },
        tutees: [],
        exceptions: { inactive7: 0, inactive28: 0 }
      });
    }

    // Documents
    const documents = await Document.find({ author: tutorId })
      .sort({ createdAt: -1 })
      .populate('author', 'fullname')
      .lean();

    const documentCount = documents.length;
    const totalDocComments = documents.reduce((sum, doc) => sum + (doc.comments?.length || 0), 0);

    const answeredDocsCount = await Document.countDocuments({
      author: tutorId,
      comments: { $exists: true, $not: { $size: 0 } }
    });

    // Blog data
    const blogs = await Blog.find({ author: tutorId })
      .sort({ createdAt: -1 })
      .populate('author', 'fullname image');

    const totalBlogs = blogs.length;
    const totalLikes = blogs.reduce((acc, blog) => acc + (blog.likes || 0), 0);
    const totalBlogComments = blogs.reduce((acc, blog) => acc + (blog.comments.length || 0), 0);

    const likedBlogs = await Blog.find({ likedBy: tutorId });
    const commentedBlogs = await Blog.find({ 'comments.user': tutorId });

    // Recent Messages
    const messages = await Message.find({ receiver: tutorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'fullname image')
      .lean();

    // Classes managed by the tutor
    const tutorClasses = await ClassModel.find({ tutor: tutor._id })
      .populate('student', '_id user name email') // Populate student with their user ID and details
      .populate('tutor')
      .lean();

    console.log('Tutor Classes:', tutorClasses); // Debugging

    // Extract all students from the classes
    const tutees = tutorClasses.flatMap(c => c.student); // Directly use the populated student objects
    console.log('Tutees:', tutees); // Debugging

    // Map student IDs to user IDs
    const userIds = tutees.map(t => t.user); // Extract user IDs from the populated student objects
    console.log('User IDs:', userIds); // Debugging

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
      const lastMsg = await Message.findOne({ sender: t.user }).sort({ createdAt: -1 }); // Use user ID
      const lastMeeting = await Meeting.findOne({ student: t.user }).sort({ startTime: -1 }); // Use user ID

      let lastActiveDate;
      if (lastMsg && lastMeeting) {
        lastActiveDate = moment.max(moment(lastMsg.createdAt), moment(lastMeeting.startTime));
      } else if (lastMsg) {
        lastActiveDate = moment(lastMsg.createdAt);
      } else if (lastMeeting) {
        lastActiveDate = moment(lastMeeting.startTime);
      }

      const lastActive = lastActiveDate ? lastActiveDate.fromNow() : 'No activity';

      const messageCount = await Message.countDocuments({ sender: t.user }); // Use user ID
      const meetingCount = await Meeting.countDocuments({ student: t._id }); // Use user ID
      const docCount = await Document.countDocuments({ author: t.user }); // Use user ID

      return {
        _id: t._id, // Student ID
        userId: t.user, // Add the user ID here
        fullname: t.name,
        email: t.email,
        lastActive,
        lastActiveDate: lastActiveDate || null,
        messageCount,
        meetingCount,
        documentCount: docCount
      };
    }));

    console.log('Tutee Data:', tuteeData); // Debugging

    // Exception reporting
    const inactive7 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 7).length;
    const inactive28 = tuteeData.filter(t => !t.lastActiveDate || moment().diff(t.lastActiveDate, 'days') >= 28).length;

    res.render('dashboard/tutorDashboard', {
      tutorName: req.user.fullname,
      tutor,
      documents,
      documentCount,
      totalDocComments,
      answeredDocsCount,
      blogs,
      totalBlogs,
      totalLikes,
      totalBlogComments,
      likedCount: likedBlogs.length,
      commentedCount: commentedBlogs.length,
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
