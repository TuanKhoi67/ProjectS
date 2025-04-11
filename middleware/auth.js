const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error', 'Bạn cần đăng nhập trước!');
    res.redirect('/auth/login');
};

const checkAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Bạn không có quyền truy cập trang admin!');
    res.redirect('/auth/login');
};

const checkTutor = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'tutor') {
        return next();
    }
    req.flash('error', 'Bạn không có quyền truy cập trang tutor!');
    res.redirect('/auth/login');
};

const checkStudent = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'student') {
        return next();
    }
    req.flash('error', 'Bạn không có quyền truy cập trang student!');
    res.redirect('/auth/login');
};

module.exports = {
    ensureAuthenticated,
    checkAdmin,
    checkTutor,
    checkStudent
};
