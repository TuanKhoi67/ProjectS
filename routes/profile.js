const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, (req, res) => {
    res.render('profile/index', { user: req.user });
});

router.get('/edit', ensureAuthenticated, (req, res) => {
    res.render('profile/edit', { user: req.user });
});

// POST /profile/edit - cập nhật thông tin người dùng
router.post('/edit', ensureAuthenticated, async (req, res) => {
    const { fullname, email } = req.body;
    try {
        await User.findByIdAndUpdate(req.user._id, { fullname, email });
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi server khi cập nhật hồ sơ');
    }
});
module.exports = router;
