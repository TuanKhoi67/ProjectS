module.exports = (io) => {
    const express = require('express');
    const router = express.Router();
    const mongoose = require('mongoose');
    const { ensureAuthenticated } = require('../middleware/auth');
    const User = require('../models/Users');
    const Student = require('../models/Student');
    const Tutor = require('../models/Tutor');
    const Message = require('../models/Message');
    const { onlineUsers } = require('../app'); // Import onlineUsers


    // 📨 Lấy danh sách người dùng và hiển thị trang chat
    router.get('/', ensureAuthenticated, async (req, res) => {
        try {
            const allUsers = await User.find({ _id: { $ne: req.user._id } }).lean();

            const enrichedUsers = await Promise.all(allUsers.map(async user => {
                let avatar = 'https://placehold.co/45x45';

                if (user.role === 'tutor') {
                    const tutor = await Tutor.findOne({ user: user._id }).lean();
                    if (tutor && tutor.imageTutor) avatar = tutor.imageTutor;
                } else if (user.role === 'student') {
                    const student = await Student.findOne({ user: user._id }).lean();
                    if (student && student.imageStudent) avatar = student.imageStudent;
                }

                return {
                    ...user,
                    avatar,
                    isOnline: !!onlineUsers[user._id] // Check if user is online
                };
            }));

            let currentUserAvatar = 'https://placehold.co/45x45';
            if (req.user.role === 'tutor') {
                const tutor = await Tutor.findOne({ user: req.user._id }).lean();
                if (tutor && tutor.imageTutor) currentUserAvatar = tutor.imageTutor;
            } else if (req.user.role === 'student') {
                const student = await Student.findOne({ user: req.user._id }).lean();
                if (student && student.imageStudent) currentUserAvatar = student.imageStudent;
            }

            res.render('message/index', {
                users: enrichedUsers,
                currentUser: {
                    ...req.user,
                    avatar: currentUserAvatar,
                    isOnline: !!onlineUsers[req.user._id] // Check if current user is online
                }
            });
        } catch (err) {
            console.error(err);
            res.redirect('/dashboard');
        }
    });


    // 📨 API lấy lịch sử chat giữa hai người
    router.get('/chat/:userId', ensureAuthenticated, async (req, res) => {
        try {
            const { userId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ error: "ID người dùng không hợp lệ" });
            }

            const messages = await Message.find({
                $or: [
                    { sender: req.user._id, receiver: userId },
                    { sender: userId, receiver: req.user._id }
                ]
            }).sort({ createdAt: 1 }).lean();

            res.json(messages);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi server" });
        }
    });

    // 📨 API gửi tin nhắn
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

            // 📝 Lưu tin nhắn vào database
            const message = new Message({ sender, receiver, content: content.trim(), createdAt: new Date() });
            await message.save();

            const messageData = {
                _id: message._id,
                sender,
                receiver,
                content: message.content,
                createdAt: message.createdAt
            };

            // 📡 Gửi tin nhắn đến người nhận qua Socket.io
            io.to(receiver).emit('receiveMessage', messageData);

            // 📡 Gửi tin nhắn đến chính người gửi để cập nhật UI
            io.to(sender).emit('messageSent', messageData);

            res.json({ success: true, message: messageData });

        } catch (error) {
            console.error("Lỗi server:", error);
            res.status(500).json({ error: "Lỗi server" });
        }
    });

    return router;

};
