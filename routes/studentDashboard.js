const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Document = require('../models/Document');
const Meeting = require('../models/Meeting');
const Message = require('../models/Message');
var ClassModel = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { ensureAuthenticated } = require('../middleware/auth');
const moment = require('moment');

router.get('/student_dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const studentId = req.user._id;
    const student = await Student.findOne({ user: studentId });

    if (!student) {
      // Render an error page or display a message if the student profile is not found
      return res.render('dashboard/studentDashboard', {
        error: 'Student profile not found. Please update your profile to access the dashboard.',
        studentName: req.user.fullname, // Pass the user's name for context
        blogs: [],
        recentMessages: [],
        classes: [],
        meetings: [],
        documents: [],
        chartData: {
          totalBlogs: 0,
          totalLikes: 0,
          totalComments: 0,
          likedCount: 0,
          commentedCount: 0,
          weeklyActivity: {},
          fileTypes: { pdf: 0, word: 0, image: 0, other: 0 }
        },
        attendanceStats: []
      });
    }

    // Blog data
    const blogs = await Blog.find({ author: studentId })
      .sort({ createdAt: -1 })
      .populate('author', 'fullname image');

    const totalBlogs = blogs.length;
    const totalLikes = blogs.reduce((acc, blog) => acc + (blog.likes || 0), 0);
    const totalComments = blogs.reduce((acc, blog) => acc + (blog.comments.length || 0), 0);

    const likedBlogs = await Blog.find({ likedBy: studentId });
    const commentedBlogs = await Blog.find({ 'comments.user': studentId });

    // Messages
    const recentMessages = await Message.find({ receiver: studentId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'fullname image')
      .lean();

    // Classes
    const classes = await ClassModel.find({ student: student._id })
      .populate('student')
      .populate('tutor')
      .sort({ createDate: -1 });
    console.log("Classes found:", classes);

    // Meetings
    const meetings = await Meeting.find({ student: student._id })
      .populate('student', 'name')
      .populate('tutor', 'name')
      .sort({ startTime: 1 })
      .lean();

    // Documents
    const documents = await Document.find({ author: studentId });

    // Weekly activity
    const today = moment().startOf('day');
    const pastWeek = [...Array(7).keys()].map(i =>
      today.clone().subtract(i, 'days').format('YYYY-MM-DD')
    );
    const weeklyActivity = {};
    pastWeek.reverse().forEach(date => weeklyActivity[date] = { blogs: 0, messages: 0, comments: 0 });

    blogs.forEach(blog => {
      const date = moment(blog.createdAt).format('YYYY-MM-DD');
      if (weeklyActivity[date]) weeklyActivity[date].blogs += 1;
      blog.comments.forEach(comment => {
        const cDate = moment(comment.createdAt).format('YYYY-MM-DD');
        if (weeklyActivity[cDate]) weeklyActivity[cDate].comments += 1;
      });
    });

    const messages = await Message.find({ receiver: studentId });
    messages.forEach(msg => {
      const msgDate = moment(msg.createdAt).format('YYYY-MM-DD');
      if (weeklyActivity[msgDate]) weeklyActivity[msgDate].messages += 1;
    });

    // Document type breakdown
    const fileTypes = { pdf: 0, word: 0, image: 0, other: 0 };
    documents.forEach(doc => {
      const ext = (doc.documentFile || doc.imageUrl || '').split('.').pop()?.toLowerCase();
      if (ext === 'pdf') fileTypes.pdf++;
      else if (['doc', 'docx'].includes(ext)) fileTypes.word++;
      else if (['jpg', 'jpeg', 'png'].includes(ext)) fileTypes.image++;
      else fileTypes.other++;
    });

    // Attendance
    const attendanceStats = [];

    for (const classItem of classes) {
      const studentsInClass = classItem.student.map(s => s._id.toString());

      if (studentsInClass.includes(student._id.toString())) {
        const presentCount = await Attendance.countDocuments({
          student_id: student._id,
          status: 'present'
        });

        const absentCount = await Attendance.countDocuments({
          student_id: student._id,
          status: 'absent'
        });

        attendanceStats.push({
          classname: classItem.classname || 'Unnamed class',
          present: presentCount,
          absent: absentCount
        });
      }
    }

    res.render('dashboard/studentDashboard', {
      studentName: req.user.fullname,
      student,
      blogs,
      recentMessages,
      classes,
      meetings,
      documents,
      chartData: {
        totalBlogs,
        totalLikes,
        totalComments,
        likedCount: likedBlogs.length,
        commentedCount: commentedBlogs.length,
        weeklyActivity,
        fileTypes
      },
      attendanceStats
    });
  } catch (error) {
    console.error('Error fetching student dashboard data:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
