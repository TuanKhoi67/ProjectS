const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const Message = require('../models/Message');

// Danh sách người dùng để chọn chat
router.get('/', async (req, res) => {
    const users = await User.find().sort({ fullname: 1 });
    res.render('message/index', { layout: 'authedLayout', users });
});

// Xử lý tìm kiếm người dùng
router.get('/search', async (req, res) => {
    const query = req.query.query;

    // Normalize query to remove diacritics
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Fetch all users and normalize their fullnames for comparison
    const users = await User.find();
    const filteredUsers = users.filter(user => 
        user.fullname
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(normalizedQuery.toLowerCase())
    );

    res.render('message/index', { layout: 'authedLayout', users: filteredUsers });
});

// Trang chat với người dùng được chọn
router.get('/chat/:receiverId', async (req, res) => {
    try {
        const receiver = await User.findById(req.params.receiverId);
        if (!receiver) {
            return res.status(404).send("Người dùng không tồn tại!");
        }

        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: req.params.receiverId },
                { sender: req.params.receiverId, receiver: req.user._id }
            ]
        }).sort({ timestamp: 1 });

        res.render('message/chat', { layout: 'authedLayout', receiver, messages });
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi server!");
    }
});



// Gửi tin nhắn
router.post('/chat/:receiverId', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).send("Tin nhắn không được để trống!");

    const newMessage = new Message({
        sender: req.user._id,
        receiver: req.params.receiverId,
        message
    });

    await newMessage.save();
    res.redirect(`/message/chat/${req.params.receiverId}`);
});

module.exports = router;
