var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var User = require('../models/Users');
var mongoose = require('mongoose');

<<<<<<< HEAD
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/index', function(req, res, next) {
  res.send('This is the users index page');
});

=======
>>>>>>> 1ac059a5e9eb7b5ebac7c3352e41da7709e44792
// Create new user with role
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = new User({
    name,
    email,
    password: hashedPassword,
    role: role || 'student' // Default role if not specified
  });
  
  await user.save();
  res.status(201).json({ message: 'User created successfully' });
});

// Get users by role
router.get('/users/role/:role', async (req, res) => {
  const users = await User.find({ role: req.params.role }).select('-password');
  res.json(users);
});

// Update user with role
router.put('/users/:id', async (req, res) => {
  const { name, email, role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { name, email, role });
  res.json({ message: 'User updated successfully' });
});

// Admin route to change user role
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'User role updated successfully' });
});


module.exports = User;