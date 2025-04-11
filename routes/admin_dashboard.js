const express = require("express");
const router = express.Router();
const moment = require('moment');
var ClassModel = require('../models/Class');
var MeetingModel = require('../models/Meeting');
var DocumentModel = require('../models/Document');
var BlogModel = require('../models/Blog');
var StudentModel = require('../models/Student');
var TutorModel = require('../models/Tutor');
var UserModel = require('../models/Users')

/* ------------------------ Phần hiển thị biểu đồ------------------------ */
router.get('/', async (req, res) => {
    try {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
  
        // Biểu đồ lớp theo tháng
        const classData = await ClassModel.aggregate([
            {
                $match: {
                    createDate: {
                        $gte: new Date(currentYear, 0, 1),
                        $lte: new Date(currentYear, currentMonth + 1, 0)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        const classResult = Array(currentMonth + 1).fill(0);
        classData.forEach(item => classResult[item._id - 1] = item.count);
  
        // Biểu đồ subject (pie chart)
        const subjectData = await StudentModel.aggregate([
            {
                $group: {
                    _id: "$subject",
                    count: { $sum: 1 }
                }
            }
        ]);
        const subjectLabels = subjectData.map(item => item._id);
        const subjectCounts = subjectData.map(item => item.count);
  
        // Biểu đồ sinh viên theo tháng
        const studentData = await StudentModel.aggregate([
            {
                $match: {
                    enrollmentDate: {
                        $gte: new Date(currentYear, 0, 1),
                        $lte: new Date(currentYear, currentMonth + 1, 0)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$enrollmentDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        const studentResult = Array(currentMonth + 1).fill(0);
        studentData.forEach(item => studentResult[item._id - 1] = item.count);
  
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6); // 7 ngày gần nhất
  
        const current_Year = now.getFullYear();
  
          // --- Biểu đồ 7 ngày gần nhất ---
          const meeting7Days = await MeetingModel.aggregate([
              {
                  $match: {
                      createDate: { $gte: sevenDaysAgo }
                  }
              },
              {
                  $group: {
                      _id: {
                          $dateToString: { format: "%d/%m", date: "$createDate" }
                      },
                      count: { $sum: 1 }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
  
          const meeting7Labels = meeting7Days.map(i => i._id);
          const meeting7Counts = meeting7Days.map(i => i.count);
  
          // --- Biểu đồ theo từng tháng từ đầu năm ---
          const meetingByMonth = await MeetingModel.aggregate([
              {
                  $match: {
                      createDate: {
                          $gte: new Date(current_Year, 0, 1), // 01/01/yyyy
                          $lte: new Date(current_Year, now.getMonth() + 1, 0) // ngày cuối tháng hiện tại
                      }
                  }
              },
              {
                  $group: {
                      _id: { $month: "$createDate" },
                      count: { $sum: 1 }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
  
          const meetingMonthLabels = [];
          const meetingMonthCounts = [];
  
          for (let i = 1; i <= now.getMonth() + 1; i++) {
              const monthData = meetingByMonth.find(m => m._id === i);
              meetingMonthLabels.push(`Tháng ${i}`);
              meetingMonthCounts.push(monthData ? monthData.count : 0);
          }
  
          const present = new Date();
          const CurrentYear = now.getFullYear();
  
          // ============ 1. SỐ DOCUMENT 7 NGÀY GẦN NHẤT ============
          const SevenDaysAgo = new Date(now);
          SevenDaysAgo.setDate(present.getDate() - 6);
  
          const docs7Days = await DocumentModel.aggregate([
              {
                  $match: { createDate: { $gte: SevenDaysAgo } }
              },
              {
                  $group: {
                      _id: {
                          $dateToString: { format: "%d/%m", date: "$createDate" }
                      },
                      count: { $sum: 1 }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
  
          const doc7Labels = docs7Days.map(d => d._id);
          const doc7Counts = docs7Days.map(d => d.count);
  
          // ============ 2. SO SÁNH THÁNG TRƯỚC VÀ THÁNG NÀY ============
          const thisMonthStart = new Date(CurrentYear, present.getMonth(), 1);
          const lastMonthStart = new Date(CurrentYear, present.getMonth() - 1, 1);
          const thisMonthEnd = new Date(CurrentYear, present.getMonth() + 1, 0);
  
          const [lastMonthDocs, thisMonthDocs] = await Promise.all([
              DocumentModel.countDocuments({
                  createDate: {
                      $gte: lastMonthStart,
                      $lt: thisMonthStart
                  }
              }),
              DocumentModel.countDocuments({
                  createDate: {
                      $gte: thisMonthStart,
                      $lte: thisMonthEnd
                  }
              })
          ]);
  
          const docMonthCompareLabels = ['Tháng trước', 'Tháng này'];
          const docMonthCompareCounts = [lastMonthDocs, thisMonthDocs];
  
          // ============ 3. DOCUMENT TỪ ĐẦU NĂM TỚI NAY ============
          const yearStart = new Date(currentYear, 0, 1);
          const monthNow = now.getMonth() + 1;
  
          const docsByMonth = await DocumentModel.aggregate([
              {
                  $match: {
                      createDate: {
                          $gte: yearStart,
                          $lte: thisMonthEnd
                      }
                  }
              },
              {
                  $group: {
                      _id: { $month: "$createDate" },
                      count: { $sum: 1 }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
  
          const docMonthlyLabels = [];
          const docMonthlyCounts = [];
  
          for (let i = 1; i <= monthNow; i++) {
              const monthData = docsByMonth.find(m => m._id === i);
              docMonthlyLabels.push(`Tháng ${i}`);
              docMonthlyCounts.push(monthData ? monthData.count : 0);
          }
  
        const today = moment();
        const startOfYear = moment().startOf('year');
        const startOfWeek = moment().startOf('isoWeek');
        const startOfLastWeek = moment().subtract(1, 'weeks').startOf('isoWeek');
        const endOfLastWeek = moment().subtract(1, 'weeks').endOf('isoWeek');
  
        const startOfMonth = moment().startOf('month');
        const startOfLastMonth = moment().subtract(1, 'months').startOf('month');
        const endOfLastMonth = moment().subtract(1, 'months').endOf('month');
  
        // 1. Blogs in last 7 days
      const past7Days = Array.from({ length: 7 }, (_, i) => moment().subtract(i, 'days').format('DD/MM'));
      const blog7Days = await Promise.all(
          past7Days.map(async (day) => {
              const count = await BlogModel.countDocuments({
                  createdAt: {
                      $gte: moment(day, 'DD/MM').startOf('day').toDate(),
                      $lte: moment(day, 'DD/MM').endOf('day').toDate()
                  }
              });
              return count;
          })
      );
  
        // 2. Blogs: last week vs this week (Pie)
        const lastWeekCount = await BlogModel.countDocuments({
          createdAt: { $gte: startOfLastWeek.toDate(), $lte: endOfLastWeek.toDate() }
        });
        const thisWeekCount = await BlogModel.countDocuments({
            createdAt: { $gte: startOfWeek.toDate() }
        });
  
        // 3. Blogs: last month vs this month (Pie)
        const lastMonthCount = await BlogModel.countDocuments({
            createdAt: { $gte: startOfLastMonth.toDate(), $lte: endOfLastMonth.toDate() }
        });
        const thisMonthCount = await BlogModel.countDocuments({
            createdAt: { $gte: startOfMonth.toDate() }
        });
  
        // 4. Blogs by month from Jan to current month
        const current_Month = moment().month();
        const monthlyLabels = Array.from({ length: current_Month + 1 }, (_, i) => `Tháng ${i + 1}`);
        const monthlyCounts = await Promise.all(
            monthlyLabels.map(async (_, i) => {
                const start = moment().month(i).startOf('month');
                const end = moment().month(i).endOf('month');
                return BlogModel.countDocuments({
                    createdAt: { $gte: start.toDate(), $lte: end.toDate() }
                });
            })
        );
  
        res.render('dashboard/admin/index', {
            chartData: JSON.stringify(classResult),
            studentChartData: JSON.stringify(studentResult),
            subjectLabels: JSON.stringify(subjectLabels),
            subjectCounts: JSON.stringify(subjectCounts),
  
            meeting7Labels: JSON.stringify(meeting7Labels),
            meeting7Counts: JSON.stringify(meeting7Counts),
            meetingMonthLabels: JSON.stringify(meetingMonthLabels),
            meetingMonthCounts: JSON.stringify(meetingMonthCounts),
  
            doc7Labels: JSON.stringify(doc7Labels),
            doc7Counts: JSON.stringify(doc7Counts),
            docMonthCompareLabels: JSON.stringify(docMonthCompareLabels),
            docMonthCompareCounts: JSON.stringify(docMonthCompareCounts),
            docMonthlyLabels: JSON.stringify(docMonthlyLabels),
            docMonthlyCounts: JSON.stringify(docMonthlyCounts),
  
            blog7Labels: JSON.stringify(past7Days.reverse()),
            blog7Counts: JSON.stringify(blog7Days.reverse()),
  
            blogWeekCompareLabels: JSON.stringify(['Tuần trước', 'Tuần này']),
            blogWeekCompareCounts: JSON.stringify([lastWeekCount, thisWeekCount]),
  
            blogMonthCompareLabels: JSON.stringify(['Tháng trước', 'Tháng này']),
            blogMonthCompareCounts: JSON.stringify([lastMonthCount, thisMonthCount]),
  
            blogMonthlyLabels: JSON.stringify(monthlyLabels),
            blogMonthlyCounts: JSON.stringify(monthlyCounts),
            
        });
  
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi máy chủ');
    }
  });
  

/* ------------------------ Hết phần hiển thị biểu đồ ------------------------ */

/* ------------------------ Phần của sinh viên ------------------------ */

router.get("/student", async (req, res) => {
    var students = await StudentModel.find({});
    res.render("dashboard/student/index", { students });
});

router.post('/add-student', async (req, res) => {
   const { name, telephone, email, subject } = req.body;

   const newStudent = new StudentModel({
       name,
       telephone,
       email,
       subject,
       enrollmentDate: new Date() // Set ngày, tháng, năm hiện tại
   });
   await newStudent.save();

   res.redirect('/admin/dashboard/student');
});

router.get("/student-edit/:id", async (req, res) => {
    var id = req.params.id;
    var student = await StudentModel.findById(id);
    console.log(student);
    res.render("dashboard/student/edit", { student });
});

router.post("/student-edit/:id", async (req, res) => {
    var id = req.params.id;
    var student = req.body;
    try {
        //SQL: UPDATE brands SET A = B WHERE id = 'id'
        await StudentModel.findByIdAndUpdate(id, student);
        console.log("update succeed !");
    } catch (err) {
        console.log("update failed. Error: " + err);
    }
    res.redirect('/admin/dashboard/student');
 });

router.get('/student-delete/:id', async (req, res) => {
    await StudentModel.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard/student');
 });

 /* ------------------------ Hết phần của sinh viên ------------------------ */

 /* ------------------------ Phần của giáo viên ------------------------ */

router.get('/tutor', async (req, res) => {
  var tutors = await TutorModel.find({});
  res.render('dashboard/tutor/index', { tutors });
});

router.get("/student-delete/:id", async (req, res) => {
    await StudentModel.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard/student");
});

/* ------------------------ Hết phần của sinh viên ------------------------ */

/* ------------------------ Phần của giáo viên ------------------------ */

router.get("/tutor", async (req, res) => {
    var tutors = await TutorModel.find({});
    res.render("dashboard/tutor/index", { tutors });
});

router.post("/add-tutor", async (req, res) => {
    const { name, email, telephone, department } = req.body;

    const newTeacher = new TutorModel({ 
         name,
         email,
         telephone,
         department,
         enrollmentDate: new Date() // Set ngày, tháng, năm hiện tại
     });
    await newTeacher.save();

    res.redirect("/admin/dashboard/tutor");
});

router.get("/tutor-edit/:id", async (req, res) => {
    var id = req.params.id;
    var tutor = await TutorModel.findById(id);
    console.log(tutor);
    res.render("dashboard/tutor/edit", { tutor });
});

router.post("/tutor-edit/:id", async (req, res) => {
    var id = req.params.id;
    var tutor = req.body;
    try {
        //SQL: UPDATE brands SET A = B WHERE id = 'id'
        await TutorModel.findByIdAndUpdate(id, tutor);
        console.log("update succeed !");
    } catch (err) {
        console.log("update failed. Error: " + err);
    }
    res.redirect("/admin/dashboard/tutor");
});

router.get("/tutor-delete/:id", async (req, res) => {
    await TutorModel.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard/tutor");
});

/* ------------------------ Hết phần của giáo viên ------------------------ */

/* ------------------------ Phần của user ------------------------ */

router.get("/user", async (req, res) => {
    try {
        const type = req.query.type || "student"; // mặc định là student

        const users = await UserModel.find().lean();

        if (type === "tutor") {
            const tutors = await TutorModel.find().lean();
            const tutorList = tutors.map((tutor) => {
                const matchingUser = users.find((user) => user.email === tutor.email);
                return {
                    ...tutor,
                    user: matchingUser || null,
                    enrollmentDateFormatted: new Date(
                        tutor.enrollmentDate
                    ).toLocaleDateString("vi-VN"),
                };
            });
            return res.render("dashboard/user/index", { type, tutors: tutorList });
        } else {
            const students = await StudentModel.find().lean();
            const studentList = students.map((student) => {
                const matchingUser = users.find((user) => user.email === student.email);
                return {
                    ...student,
                    user: matchingUser || null,
                    enrollmentDateFormatted: new Date(
                        student.enrollmentDate
                    ).toLocaleDateString("vi-VN"),
                };
            });
            return res.render("dashboard/user/index", {
                type,
                students: studentList,
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

/* ------------------------ Hêt phần của user ------------------------ */

module.exports = router;