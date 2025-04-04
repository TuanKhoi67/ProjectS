const express = require("express");
const router = express.Router();
//const UserModel = require("../models/Users"); // Model User
const StudentModel = require("../models/Student"); // Model Student
const TutorModel = require("../models/Tutor"); // Model Tutor
const MeetingModel = require("../models/Meeting"); // Model Meeting
const { createGoogleMeet, sendEmail } = require("../services/googleMeet");

// Route GET: Render form tạo meeting
router.get("/create", async (req, res) => {
  try {
      const students = await StudentModel.find().lean();
      const tutors = await TutorModel.find().lean();
      res.render("meeting/add", { students, tutors });
  } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).send("Lỗi server");
  }
});


router.post("/create", async (req, res) => {
    try {
      const { title, location, note, startTime, endTime, students = [], tutors = [] } = req.body;
  
      // Kiểm tra xem students và tutors có phải là mảng không
      if (!Array.isArray(students)) {
        return res.status(400).json({ error: "'students' phải là một mảng" });
      }
      if (!Array.isArray(tutors)) {
        return res.status(400).json({ error: "'tutors' phải là một mảng" });
      }
  
      // Kiểm tra thời gian bắt đầu và kết thúc có hợp lệ
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Cả startTime và endTime phải có giá trị" });
      }
  
      // Chuyển startTime và endTime thành chuỗi ISO 8601 (hoặc bạn có thể định dạng theo kiểu khác nếu cần)
      const startDateTime = new Date(`${startTime}`).toISOString();  // Đảm bảo là định dạng ISO 8601
      const endDateTime = new Date(`${endTime}`).toISOString();      // Đảm bảo là định dạng ISO 8601
  
      // Kiểm tra xem thời gian kết thúc có sau thời gian bắt đầu không
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        return res.status(400).json({ error: "Thời gian kết thúc phải sau thời gian bắt đầu" });
      }
  
     // Tạo Meeting
    const meetingData = {
        title,
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
        return res.status(400).json({ error: "Không có người tham dự nào được định nghĩa" });
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
        return res.status(400).json({ error: "Không thể lấy email của người tham dự" });
      }
  
      // Tạo Google Meet thông qua API
      const meeting = await createGoogleMeet({ title, location, note, startTime: startDateTime, endTime: endDateTime, attendees });
      console.log("Meeting created:", meeting);
  
      // Soạn nội dung email
      const emailMessage = `Cuộc họp của bạn đã được lên lịch.\nTham gia tại: ${meeting.hangoutLink}`;
  
      // Gửi email
      sendEmail(emailRecipients, "Lịch Họp Google Meet", emailMessage);
  
      // Trả về phản hồi thành công
      res.json({ message: "Lịch họp đã được tạo!", meetLink: meeting.hangoutLink });
    } catch (error) {
        console.error("Error from Google Meet API:", error.response?.data?.details || error.message);
        res.status(500).json({ error: "Lỗi khi tạo lịch họp", details: error.message });
    }
  });
  




// router.post("/create", async (req, res) => {
//   try {
//       const { title, location, note, students, tutors } = req.body;
//       const attendees = [...students, ...tutors];

//       const meeting = await createGoogleMeet({ title, location, note, attendees });

//       const emailMessage = `Cuộc họp của bạn đã được lên lịch.\nTham gia tại: ${meeting.hangoutLink}`;

//       sendEmail(attendees, "Lịch Họp Google Meet", emailMessage);

//       res.json({ message: "Lịch họp đã được tạo!", meetLink: meeting.hangoutLink });
//   } catch (error) {
//       res.status(500).json({ error: "Lỗi khi tạo lịch họp" });
//   }
// });


module.exports = router;