const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'tutor', 'admin'],
    default: 'student'
  }
});

userSchema.statics.createDefaultAdmin = async function() {
  const adminExists = await this.findOne({ role: 'admin' });
  if (!adminExists) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await this.create({
      fullname: 'System Admin',
      email: 'admin@system.com',
      password: hashedPassword,
      role: 'admin',
      isDefaultAdmin: true
    });
  }
};

const User = mongoose.model('User', userSchema);

// Call this after model initialization
User.createDefaultAdmin();

module.exports = User;