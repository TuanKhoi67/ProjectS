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
const hbs = require('hbs');
const dotenv = require('dotenv');

require('./config/database');
require('./config/passport')(passport);
require('./config/upload');
require('./middleware/auth');

hbs.registerHelper('contains', function(array, value) {
  // Kiểm tra xem array có phải là một mảng hợp lệ không
  if (!array || !Array.isArray(array)) {
      return false; // Trả về false nếu array không phải là mảng
  }
  return array.indexOf(value) !== -1;
});

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 🟢 Danh sách người dùng online
const onlineUsers = {};

// Export onlineUsers so it can be shared
module.exports.onlineUsers = onlineUsers;

// 📡 Xử lý kết nối socket.io
io.on('connection', (socket) => {
  console.log(`⚡ Client kết nối: ${socket.id}`);

  // 🧾 Khi người dùng đăng nhập hoặc kết nối
  socket.on('registerUser', (userId) => {
    socket.join(userId); // Tham gia vào room riêng theo userId
    onlineUsers[userId] = socket.id;
    console.log(`✅ User ${userId} đã vào phòng (${socket.id})`);

    // Notify all clients about the updated online status
    io.emit('userStatusChange', { userId, isOnline: true });
  });

  // 📩 Khi người dùng gửi tin nhắn
  socket.on('sendMessage', (data) => {
    const { sender, receiver, message, timestamp } = data;

    console.log(`📨 Tin nhắn từ ${sender} đến ${receiver}: ${message}`);

    // Gửi tin nhắn cho người nhận nếu đang online
    if (onlineUsers[receiver]) {
      io.to(receiver).emit('receiveMessage', {
        sender,
        message,
        timestamp
      });
      console.log(`📤 Tin nhắn gửi đến ${receiver}`);
    } else {
      console.log(`⛔ Người dùng ${receiver} đang offline`);
      // TODO: Lưu vào DB hoặc xử lý khi người dùng offline
    }
  });

  // ❌ Khi người dùng ngắt kết nối
  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(onlineUsers).find(
      key => onlineUsers[key] === socket.id
    );
    if (disconnectedUser) {
      delete onlineUsers[disconnectedUser];
      console.log(`❌ User ${disconnectedUser} (${socket.id}) đã ngắt kết nối`);

      // Notify all clients about the updated online status
      io.emit('userStatusChange', { userId: disconnectedUser, isOnline: false });
    }
  });
});

// 🔧 Middleware cơ bản
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(flash());
// Lưu Socket.io vào app để sử dụng trong routes
app.set('socketio', io);

// ✅ Đăng ký helper "eq" sau khi import hbs
hbs.registerHelper('eq', function (a, b) {
  return a === b;
});

hbs.registerHelper("isSender", function (sender, userId) {
  return sender.toString() === userId.toString();
});


hbs.registerHelper('formatDate', function (date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
});

hbs.registerHelper('absolutePath', function (path) {
  if (!path) {
    return ''; // Return an empty string if the path is undefined or null
  }

  // Check if the path is a URL (starts with http:// or https://)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path; // Return the URL as is
  }

  // Check if the path is a pdf (ends with .pdf or .PDF)
  if (path.endsWith('.pdf') || path.endsWith('.PDF')) {
    return path; // Return the URL as is
  }

  // Check if the path is a doc (ends with .doc or .docx)
  if (path.endsWith('.doc') || path.endsWith('.docx') || path.endsWith('.DOC') || path.endsWith('.DOCX')) {
    return path; // Return the URL as is
  }

  // Otherwise, ensure the path starts with a '/'
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return path;
});

hbs.registerHelper('json', function (context) {
  return JSON.stringify(context);
});
// 🛡 Cấu hình session & Passport
app.use(session({
  secret: 'yourSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// ✅ Xác thực user cho mọi request
const { ensureAuthenticated } = require('./middleware/auth');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// 🔗 Import Routes
const routes = {
  index: require('./routes/index'),
  users: require('./routes/users'),
  auth: require('./routes/auth'),
  message: require('./routes/message')(io),
  meeting: require('./routes/meeting'),
  document: require('./routes/document'),
  blog: require('./routes/blog'),
  admin_dashboard: require('./routes/admin_dashboard'),
  studentDashboard: require('./routes/studentDashboard'),
  tutorDashboard: require('./routes/tutorDashboard'),
  userpage: require('./routes/userpage'),
  class: require('./routes/class'),
  schedule: require('./routes/schedule'),
  attendance: require('./routes/attendance'),
  profile: require('./routes/profile')
};


// 🛣 Định nghĩa Routes
app.use('/', routes.index);
app.use('/users', routes.users);
app.use('/auth', routes.auth);
app.use('/message', routes.message);
app.use('/api/meeting', routes.meeting);
app.use('/document', routes.document);
app.use('/blog', routes.blog);
app.use('/admin/dashboard', routes.admin_dashboard);
app.use('/dashboard', routes.tutorDashboard);
app.use('/dashboard', routes.studentDashboard);
app.use('/userpage', routes.userpage);
app.use('/class', routes.class);
app.use('/schedule', routes.schedule);
app.use('/attendance', routes.attendance);
app.use('/profile', routes.profile);


// ❌ Xử lý lỗi 404
app.use((req, res, next) => next(createError(404)));

// ❌ Xử lý lỗi chung
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 400);
  res.render('error');
});


// 🚀 **Chạy server**
httpServer.listen(3001, () => {
  console.log('🚀 Server is running on port 3001');
});

module.exports = app;
