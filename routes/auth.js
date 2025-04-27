const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { ensureAuthenticated, checkAdmin, checkStudent, checkTutor } = require('../middleware/auth');
const User = require('../models/Users');

// Display the registration page
router.get('/register', (req, res) => res.render('auth/register', { message: req.flash('error') }));

// Handle registration
router.post('/register', async (req, res) => {
    const { fullname, email, password, role } = req.body;
    try {
        if (await User.findOne({ email })) {
            req.flash('error', 'Email has already been used!');
            return res.redirect('/auth/register');
        }

        await new User({ fullname, email, password: await bcrypt.hash(password, 10), role }).save();
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'System error, please try again!');
        res.redirect('/auth/register');
    }
});

// Display the login page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect(getRedirectPath(req.user.role));
    res.render('auth/login', { message: req.flash('error') });
});

// Handle login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error', info?.message || 'Login failed');
            return res.redirect('/auth/login');
        }
        req.logIn(user, (err) => (err ? next(err) : res.redirect(getRedirectPath(user.role))));
    })(req, res, next);
});

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash('success_msg', 'You have logged out');
        res.redirect('/auth/login');
    });
});

// Admin personal page route
router.get('/admin', ensureAuthenticated, checkAdmin, (req, res) => {
    res.render('userpage/admin', { user: req.user });
});

// Tutor personal page route
router.get('/tutor', ensureAuthenticated, checkTutor, (req, res) => {
    res.render('userpage/tutor', { user: req.user });
});

// Student personal page route
router.get('/student', ensureAuthenticated, checkStudent, (req, res) => {
    res.render('userpage/student', { user: req.user });
});

// Helper function to navigate based on role
function getRedirectPath(role) {
    console.log("🔹 Redirecting role:", role); // Debug
    if (!role) {
        console.error("❌ Role is undefined!"); // Nếu lỗi xảy ra, log ra console
        return '/auth/login';
    }

    switch (role) {
        case 'admin': return '/userpage/admin';
        case 'tutor': return '/blog/tutor';
        case 'student': return '/blog/student';
        default: return '/';
    }
}

module.exports = router;
