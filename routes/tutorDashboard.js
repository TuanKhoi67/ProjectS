const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { ensureAuthenticated } = require('../middleware/auth');

// 🧑‍🏫 Dashboard dành cho tutor
router.get('/tutor_dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const tutorId = req.user._id;

        // Đếm số lượng tài liệu mà tutor đã tạo
        const documents = await Document.find({ author: tutorId });

        const documentCount = documents.length;

        // Tính tổng số comment từ tất cả các tài liệu của tutor
        const totalComments = documents.reduce((sum, doc) => {
            return sum + (doc.comments ? doc.comments.length : 0);
        }, 0);

        res.render('dashboard/tutorDashboard', {
            documentCount,
            totalComments,
            tutor: req.user
        });

    } catch (error) {
        console.error('❌ Lỗi khi tải dashboard tutor:', error);
        res.status(500).send('Lỗi server khi lấy dữ liệu dashboard.');
    }
});

module.exports = router;
