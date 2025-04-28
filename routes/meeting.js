const express = require("express");
const router = express.Router();
//const UserModel = require("../models/Users"); // Model User
const StudentModel = require("../models/Student"); // Model Student
const TutorModel = require("../models/Tutor"); // Model Tutor
const MeetingModel = require("../models/Meeting"); // Model Meeting
const { createGoogleMeet, sendEmail } = require("../services/googleMeet");


router.get('/', async (req, res) => {
  try {
      const meetings = await MeetingModel.find()
          .populate('student')
          .populate('tutor')
          .lean(); // .lean() để dữ liệu tương thích với Handlebars

      res.render('meeting/index', { meetings });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// Route GET: Render form tạo meeting
router.get("/create", async (req, res) => {
  try {
      const students = await StudentModel.find().lean();
      const tutors = await TutorModel.find().lean();
      res.render("meeting/add", { students, tutors });
  } catch (error) {
      console.error("Error while retrieving data:", error);
      res.status(500).send("Server error");
  }
});


router.post("/create", async (req, res) => {
    try {
      const { title, form, location, note, startTime, endTime, students = [], tutors = [] } = req.body;
  
      // Kiểm tra xem students và tutors có phải là mảng không
      if (!Array.isArray(students)) {
        return res.status(400).json({ error: "'students' must be an array" });
      }
      if (!Array.isArray(tutors)) {
        return res.status(400).json({ error: "'tutors' must be an array" });
      }
  
      // Kiểm tra thời gian bắt đầu và kết thúc có hợp lệ
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "startTime and endTime must have value" });
      }
  
      // Chuyển startTime và endTime thành chuỗi ISO 8601 (hoặc bạn có thể định dạng theo kiểu khác nếu cần)
      const startDateTime = new Date(`${startTime}`).toISOString();  // Đảm bảo là định dạng ISO 8601
      const endDateTime = new Date(`${endTime}`).toISOString();      // Đảm bảo là định dạng ISO 8601
  
      // Kiểm tra xem thời gian kết thúc có sau thời gian bắt đầu không
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        return res.status(400).json({ error: "The end time must be after the start time." });
      }
  
     // Tạo Meeting
    const meetingData = {
        title,
        form,
        location,
        note,
        startTime: startDateTime,
        endTime: endDateTime,
        student: students,  // Giữ nguyên các ObjectId của students
        tutor: tutors,      // Giữ nguyên các ObjectId của tutors
        status: "Scheduled", // Mặc định trạng thái là "Scheduled"
      };
  
      // Lưu cuộc họp vào database
      const newMeeting = await MeetingModel.create(meetingData);
      console.log("Meeting created:", newMeeting);
  
      // Tạo danh sách người tham dự
      const attendees = [...students, ...tutors];
      if (attendees.length === 0) {
        return res.status(400).json({ error: "No attendees defined" });
      }
  
      // Kiểm tra xem các ObjectId có hợp lệ và tồn tại trong cơ sở dữ liệu không
      const studentsInDb = await StudentModel.find({ '_id': { $in: students } }).exec();
      const tutorsInDb = await TutorModel.find({ '_id': { $in: tutors } }).exec();
  
      // Lấy email của người tham dự
      const attendeeEmails = [
        ...studentsInDb.map(student => ({ email: student.email })),
          ...tutorsInDb.map(tutor => ({ email: tutor.email })),
      ];

      const emailRecipients = attendeeEmails.map(attendee => attendee.email);
      
      console.log("Attendees Email List:", attendeeEmails);

      // Kiểm tra xem có email hợp lệ không
      if (attendeeEmails.length === 0) {
        return res.status(400).json({ error: "Unable to get attendee email" });
      }
  
      // Tạo Google Meet thông qua API
      const meeting = await createGoogleMeet({ title, form, location, note, startTime: startDateTime, endTime: endDateTime, attendees });
      console.log("Meeting created:", meeting);
  
      // Soạn nội dung email
      const emailMessage = `You are invited to a meeting. At ${startTime}.\nJoin at: ${meeting.hangoutLink}`;
  
      // Gửi email
      sendEmail(emailRecipients, "Google Meet", emailMessage);
  
      // Trả về phản hồi thành công
      res.json({ message: "Meeting schedule created!", meetLink: meeting.hangoutLink });
    } catch (error) {
        console.error("Error from Google Meet API:", error.response?.data?.details || error.message);
        res.status(500).json({ error: "Error", details: error.message });
    }
  });

router.get('/delete/:id', async (req, res) => {
  const id = req.params.id;

  try {
      await MeetingModel.findByIdAndDelete(id);
      res.redirect('/api/meeting');
  } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting meeting');
  }
 });
