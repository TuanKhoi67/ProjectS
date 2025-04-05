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

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: { origin: "*" }
});

// 🟢 Danh sách người dùng online
const onlineUsers = {};

// 📡 Xử lý kết nối socket.io
io.on('connection', (socket) => {
    console.log("⚡ Client kết nối:", socket.id);

    // ✅ Đăng ký user vào phòng theo userId
    socket.on('registerUser', (userId) => {
        socket.join(userId);
        onlineUsers[userId] = socket.id;
        console.log(`✅ User ${userId} joined room`);
    });

    // ✅ Xử lý gửi tin nhắn
    socket.on('sendMessage', (data) => {
        console.log("📩 Nhận tin nhắn từ client:", data);

        // 📡 Gửi tin nhắn đến người nhận
        io.to(data.receiver).emit('receiveMessage', data);

        // 📡 Gửi tin nhắn đến chính người gửi để cập nhật UI
        io.to(data.sender).emit('messageSent', data);
    });

    // ❌ Xóa user khi ngắt kết nối
    socket.on('disconnect', () => {
        for (const userId in onlineUsers) {
            if (onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                console.log(`❌ User ${userId} disconnected`);
                break;
            }
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

// ✅ Đăng ký helper "eq" sau khi import hbs
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

hbs.registerHelper("isSender", function (sender, userId) {
  return sender.toString() === userId.toString();
});

hbs.registerHelper('formatDate', function(date) {
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
  tutor: require('./routes/Tutor'),
  message: require('./routes/message')(io), // Truyền io vào router message
  meeting: require('./routes/meeting'),
  document: require('./routes/document'),
  blog: require('./routes/blog'),
  admin_dashboard: require('./routes/admin_dashboard'),
  userpage: require('./routes/userpage'),
  class: require('./routes/class'),
  schedule: require('./routes/schedule'),
  profile: require('./routes/profile')
};

// 🛣 Định nghĩa Routes
app.use('/', routes.index);
app.use('/users', routes.users);
app.use('/auth', routes.auth);
app.use('/tutor', routes.tutor);
app.use('/message', routes.message);
app.use('/meeting', routes.meeting);
app.use('/document', routes.document);
app.use('/blog', routes.blog);
app.use('/admin/dashboard', routes.admin_dashboard);
app.use('/userpage', routes.userpage);
app.use('/class', routes.class);
app.use('/schedule', routes.schedule);
app.use('/profile', routes.profile);

// ❌ Xử lý lỗi 404
app.use((req, res, next) => next(createError(404)));

// ❌ Xử lý lỗi chung
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// 🚀 **Chạy server**
httpServer.listen(3001, () => {
  console.log('🚀 Server is running on port 3001');
});

module.exports = app;
