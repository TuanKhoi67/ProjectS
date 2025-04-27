const express = require("express");
const router = express.Router();
//const UserModel = require("../models/Users"); // User Model
const StudentModel = require("../models/Student"); // Student Model
const TutorModel = require("../models/Tutor"); // Tutor Model
const MeetingModel = require("../models/Meeting"); // Meeting Model
//const { createGoogleMeet, sendEmail } = require("../services/googleMeet");

// Route GET: Display list of meetings
router.get('/', async (req, res) => {
  try {
      const meetings = await MeetingModel.find()
          .populate('student')
          .populate('tutor')
          .lean(); // .lean() to make data compatible with Handlebars

      res.render('meeting/index', { meetings });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// Route GET: Render form to create a meeting
router.get("/create", async (req, res) => {
  try {
      const students = await StudentModel.find().lean();
      const tutors = await TutorModel.find().lean();
      res.render("meeting/add", { students, tutors });
  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("Server Error");
  }
});

// Route POST: Handle meeting creation
router.post("/create", async (req, res) => {
    try {
      const { title, form, location, note, startTime, endTime, students = [], tutors = [] } = req.body;
  
      // Check if students and tutors are arrays
      if (!Array.isArray(students)) {
        return res.status(400).json({ error: "'students' must be an array" });
      }
      if (!Array.isArray(tutors)) {
        return res.status(400).json({ error: "'tutors' must be an array" });
      }
  
      // Check if startTime and endTime are provided
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Both startTime and endTime are required" });
      }
  
      // Convert startTime and endTime to ISO 8601 format
      const startDateTime = new Date(`${startTime}`).toISOString();
      const endDateTime = new Date(`${endTime}`).toISOString();
  
      // Validate that end time is after start time
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        return res.status(400).json({ error: "End time must be after start time" });
      }
  
      // Prepare meeting data
      const meetingData = {
        title,
        form,
        location,
        note,
        startTime: startDateTime,
        endTime: endDateTime,
        student: students,  // Keep student ObjectIds
        tutor: tutors,      // Keep tutor ObjectIds
        status: "Scheduled", // Default status
      };
  
      // Save meeting to database
      const newMeeting = await MeetingModel.create(meetingData);
      console.log("Meeting created:", newMeeting);
  
      // Prepare attendee list
      const attendees = [...students, ...tutors];
      if (attendees.length === 0) {
        return res.status(400).json({ error: "No attendees were defined" });
      }
  
      // Validate attendees' ObjectIds in database
      const studentsInDb = await StudentModel.find({ '_id': { $in: students } }).exec();
      const tutorsInDb = await TutorModel.find({ '_id': { $in: tutors } }).exec();
  
      // Extract attendee emails
      const attendeeEmails = [
        ...studentsInDb.map(student => ({ email: student.email })),
        ...tutorsInDb.map(tutor => ({ email: tutor.email })),
      ];

      const emailRecipients = attendeeEmails.map(attendee => attendee.email);
      
      console.log("Attendee email list:", attendeeEmails);

      // Check if attendee emails exist
      if (attendeeEmails.length === 0) {
        return res.status(400).json({ error: "Could not retrieve attendee emails" });
      }
  
      // Create Google Meet through API
      const meeting = await createGoogleMeet({ title, form, location, note, startTime: startDateTime, endTime: endDateTime, attendees });
      console.log("Meeting created:", meeting);
  
      // Prepare email content
      const emailMessage = `Your meeting has been scheduled.\nJoin here: ${meeting.hangoutLink}`;
  
      // Send email
      sendEmail(emailRecipients, "Google Meet Schedule", emailMessage);
  
      // Return success response
      res.json({ message: "Meeting has been scheduled!", meetLink: meeting.hangoutLink });
    } catch (error) {
        console.error("Error from Google Meet API:", error.response?.data?.details || error.message);
        res.status(500).json({ error: "Error creating meeting", details: error.message });
    }
});

// Route GET: Delete a meeting by ID
router.get('/delete/:id', async (req, res) => {
    await MeetingModel.findByIdAndDelete(req.params.id);
    res.redirect('/api/meeting');
});

// Route POST: Delete a meeting by ID
router.post('/delete/:id', async (req, res) => {
    try {
        await MeetingModel.findByIdAndDelete(req.params.id);
        res.redirect('api/meeting'); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Deleting error.");
    }
});

module.exports = router;
