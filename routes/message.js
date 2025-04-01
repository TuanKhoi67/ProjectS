module.exports = (io) => {
    const express = require('express');
    const router = express.Router();
    const mongoose = require('mongoose');
    const { ensureAuthenticated } = require('../middleware/auth');
    const User = require('../models/Users');
    const Message = require('../models/Message');

    // Lấy danh sách người dùng và hiển thị trang chat
    router.get('/', ensureAuthenticated, async (req, res) => {
        try {
            const users = await User.find({ _id: { $ne: req.user._id } }).lean();
            res.render('message/index', { users, currentUser: req.user });
        } catch (err) {
            console.error(err);
            res.redirect('/dashboard');
        }
    });

    // API lấy lịch sử chat với một người
    router.get('/chat/:userId', ensureAuthenticated, async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
                return res.status(400).json({ error: "ID người dùng không hợp lệ" });
            }

            const messages = await Message.find({
                $or: [
                    { sender: req.user._id, receiver: req.params.userId },
                    { sender: req.params.userId, receiver: req.user._id }
                ]
            }).sort({ createdAt: 1 }).lean();

            res.json(messages);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi server" });
        }
    });

    // API gửi tin nhắn
    router.post('/chat', ensureAuthenticated, async (req, res) => {
        try {
            const { receiver, content } = req.body;
            const sender = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(receiver)) {
                return res.status(400).json({ error: "ID người nhận không hợp lệ" });
            }

            if (!content || content.trim().length === 0) {
                return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });
            }

            // Tạo tin nhắn mới
            const message = new Message({ 
                sender, 
                receiver, 
                content: content.trim(),
                createdAt: new Date()
            });
            
            await message.save();

            // Tạo payload tin nhắn để gửi qua socket
            const messageData = {
                _id: message._id,
                sender,
                receiver,
                content: message.content,
                createdAt: message.createdAt
            };

            // Gửi tin nhắn đến người nhận nếu họ đang online
            io.to(receiver).emit('receiveMessage', messageData);
            
            // Xác nhận tin nhắn đã được gửi cho người gửi
            io.to(sender).emit('messageSent', messageData);

            res.json({ success: true, message: messageData });

        } catch (error) {
            console.error("Lỗi server:", error);
            res.status(500).json({ error: "Lỗi server" });
        }
    });

    return router;
};