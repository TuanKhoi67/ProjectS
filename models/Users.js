// models/Users.js
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'tutor', 'student'], required: true }
});
module.exports = mongoose.model('Users', UserSchema);
