const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'tutor'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

blogSchema.methods.formatEnrollmentDate = function () {
    const date = this.enrollmentDate;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
 };

module.exports = mongoose.model('Blog', blogSchema);