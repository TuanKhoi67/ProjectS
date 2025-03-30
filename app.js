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
var documentRoutes = require('./routes/document');
var blogRoutes = require('./routes/blog');
var dashboardRoutes = require('./routes/admin_dashboard');
var userpageRoutes = require('./routes/userpage');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIo(server);


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
app.set('io', io);

io.on('connection', (socket) => {
  console.log("🔵 User connected:", socket.id);

  socket.on('disconnect', () => {
      console.log("🔴 User disconnected:", socket.id);
  });
});

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
  meeting: require('./routes/meeting'),
  document: require('./routes/document'),
  blog: require('./routes/blog'),
  admin_dashboard: require('./routes/admin_dashboard'),
  userpage: require('./routes/userpage'),
  class: require('./routes/class'),
  schedule: require('./routes/schedule')
};

// Định nghĩa Routes
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
app.use('/schedule', routes.schedule)
const onlineUsers = {};


// Xử lý lỗi 404
app.use((req, res, next) => next(createError(404)));

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 400);
  res.render('error');
});

app.listen(3001, () => {
  console.log('Server is running');
});

module.exports = app;
