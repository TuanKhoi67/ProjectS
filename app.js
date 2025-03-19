const createError = require('http-errors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const hbs = require('hbs'); 
var mongoose = require('mongoose');
const bodyParser = require('body-parser');


require('./config/database'); // cam' xoa'
require('./config/passport')(passport); //cam' xoa'

// Register eq helper
hbs.registerHelper('eq', function(a, b) {
    return a === b;
});


// Import các route
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRoutes = require('./routes/auth');
var tutorRoutes = require('./routes/Tutor');
var messageRoutes = require('./routes/message');
var appointmentRoutes = require('./routes/appointment');
var documentRoutes = require('./routes/document');
var blogRoutes = require('./routes/blog');
var dashboardRoutes = require('./routes/dashboard');
var userpageRoutes = require('./routes/userpage'); // Thêm dòng này



const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// var mongoose = require("mongoose");
// //var uri = "mongodb+srv://cuongtranmongo:fHRny7q9u4wN9iAE@toystore.cqorbge.mongodb.net/ToyStore";
// var uri = "mongodb://localhost:27017/eTutoring";
// mongoose.set('strictQuery', true); 

// mongoose.connect(uri)
// .then(() => console.log ("Connect to DB succeed !"))
// .catch((err) => console.log (err));


// Middleware cơ bản
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(flash());
app.use(passport.initialize());

// ✅ Đăng ký helper "eq" sau khi import hbs
hbs.registerHelper("isSender", function (sender, userId) {
  return sender.toString() === userId.toString();
});



// Cấu hình session & Passport
app.use(session({
  secret: 'yourSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Middleware xác thực
const { ensureAuthenticated } = require('./middleware/auth');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Import Routes
const routes = {
  index: require('./routes/index'),
  users: require('./routes/users'),
  auth: require('./routes/auth'),
  tutor: require('./routes/Tutor'),
  message: require('./routes/message'),
  appointment: require('./routes/appointment'),
  document: require('./routes/document'),
  blog: require('./routes/blog'),
  dashboard: require('./routes/dashboard'),
  userpage: require('./routes/userpage')
};

// Định nghĩa Routes
app.use('/', routes.index);
app.use('/users', routes.users);
app.use('/auth', routes.auth);
app.use('/tutor', routes.tutor);
app.use('/message', routes.message);
app.use('/appointment', routes.appointment);
app.use('/document', routes.document);
app.use('/blog', routes.blog);
app.use('/dashboard', routes.dashboard);
app.use('/userpage', routes.userpage);


app.use((req, res, next) => {
  if (!req.session) {
      console.error("❌ ERROR: req.session is undefined! Check express-session configuration.");
      return next();
  }

  if (!req.session.firstPath && req.method === 'GET' && !req.path.startsWith('/auth')) {
      req.session.firstPath = req.path;
      console.log("🔹 First visited path stored:", req.session.firstPath);
  }

  console.log("📌 Current firstPath in session:", req.session.firstPath); // Debug log
  next();
});

const onlineUsers = {};

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔗 Một người dùng đã kết nối');

  socket.on('registerUser', (userId) => {
      socket.userId = userId;
      console.log(`✅ Người dùng ${userId} đã đăng ký socket.`);
      socket.join(userId);
  });

  socket.on('chat message', async (msg) => {
      console.log("📩 Nhận tin nhắn từ client:", msg);

      if (!msg.sender || !msg.receiver || !msg.message) {
          console.error("⚠️ Tin nhắn không hợp lệ!", msg);
          return;
      }

      try {
          // Lưu tin nhắn vào database
          const newMessage = new Message({
              sender: msg.sender,
              receiver: msg.receiver,
              message: msg.message
          });

          await newMessage.save();
          console.log("✅ Tin nhắn đã lưu vào database:", newMessage);

          // Lấy thông tin người gửi và người nhận từ DB
          const senderInfo = await User.findById(msg.sender);
          const receiverInfo = await User.findById(msg.receiver);

          if (!senderInfo || !receiverInfo) return console.error("⚠️ Không tìm thấy người gửi hoặc người nhận!");

          // Gửi tin nhắn đến đúng hai người
          // Gửi tin nhắn ngay lập tức cho cả người gửi và người nhận
        io.to(msg.sender).emit("chat message", {
          sender: msg.sender,
          receiver: msg.receiver,
          senderName: "Bạn",
          message: msg.message,
          });

          io.to(msg.receiver).emit("chat message", {
              sender: msg.sender,
              receiver: msg.receiver,
              senderName: msg.senderName, // Lấy tên từ client để hiển thị chính xác
              message: msg.message,
          });

          console.log("📩 Tin nhắn đã gửi đến:", msg.sender, msg.receiver);
          
      } catch (err) {
          console.error("❌ Lỗi khi lưu tin nhắn vào database:", err);
      }
  });

  socket.on('disconnect', () => {
      console.log(`❌ Người dùng ${socket.userId} đã ngắt kết nối`);
  });
});

// Xử lý lỗi 404
app.use((req, res, next) => next(createError(404)));

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3001, () => {
  console.log('Server is running on https://localhost:3001');
});

module.exports = app;
