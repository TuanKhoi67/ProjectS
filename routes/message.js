const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/Users');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }); // Lấy danh sách người dùng (trừ bản thân)
        res.render('message/index', { users, currentUser: req.user });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

router.get('/chat/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user._id }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi server');
    }
});

// API gửi tin nhắn
router.post('/chat', ensureAuthenticated, async (req, res) => {
    try {
        const { receiver, message } = req.body;
        if (!message) return res.status(400).send("Nội dung tin nhắn không được để trống!");

        const newMessage = new Message({ sender: req.user._id, receiver, message });
        await newMessage.save();

        // Gửi tin nhắn qua Socket.io
        req.app.get('io').emit("chat message", newMessage);

        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi server');
    }
});
module.exports = router;