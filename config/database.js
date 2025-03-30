var mongoose = require('mongoose');

var uri = "mongodb+srv://TestProject123456:123@cluster0.zbmtc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.set('strictQuery', true);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.log('❌ MongoDB connection error:', err));

// var mongoose = require("mongoose");
// //var uri = "mongodb+srv://cuongtranmongo:fHRny7q9u4wN9iAE@toystore.cqorbge.mongodb.net/ToyStore";
// var uri = "mongodb://localhost:27017/ProjectS";
// mongoose.set('strictQuery', true); 

// mongoose.connect(uri)
// .then(() => console.log ("Connect to DB succeed !"))
// .catch((err) => console.log (err));
