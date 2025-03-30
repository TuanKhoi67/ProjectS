const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/Users');
const Message = require('../models/Message');

module.exports = (io) => {
    // Lấy danh sách người dùng và hiển thị trang chat
    router.get('/', ensureAuthenticated, async (req, res) => {
        try {
            const users = await User.find({ _id: { $ne: req.user._id } }).lean();
            res.render('message/index', { 
                users,
                currentUser: req.user // Sửa thành req.user để trùng với template
            });
        } catch (err) {
            console.error(err);
            res.redirect('/dashboard');
        }
    });

    // API lấy lịch sử chat với 1 người
    router.get('/chat/:userId', ensureAuthenticated, async (req, res) => {
        try {
            // Validate ObjectId
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

            // Validate input
            if (!mongoose.Types.ObjectId.isValid(receiver)) {
                return res.status(400).json({ error: "ID người nhận không hợp lệ" });
            }

            if (!content || content.trim().length === 0) {
                return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });
            }

            // Tạo và lưu tin nhắn
            const message = new Message({ 
                sender, 
                receiver, 
                content: content.trim(),
                createdAt: new Date()
            });
            
            await message.save();

            // Gửi real-time qua socket.io
            io.to(receiver).emit('receiveMessage', message);
            io.to(sender).emit('messageSent', message); // Xác nhận gửi thành công

            res.json({ 
                success: true, 
                message: {
                    ...message._doc,
                    timestamp: message.createdAt.toISOString()
                }
            });

        } catch (error) {
            console.error("Lỗi server:", error);
            res.status(500).json({ error: "Lỗi server" });
        }
    });

    return router;
};