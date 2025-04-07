var mongoose = require('mongoose');

var uri = "mongodb+srv://ptn123:123@project.r7zcg.mongodb.net/?retryWrites=true&w=majority&appName=Project";

mongoose.set('strictQuery', true);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.log('❌ MongoDB connection error:', err));
