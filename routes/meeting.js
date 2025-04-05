var express = require('express');
var router = express.Router();
var MeetingModel = require('../models/Meeting');

router.get('/', async (req, res) => {
   var meetings = await MeetingModel.find({});
   res.render('meeting/index', { meetings });
})

router.get('/add', (req, res) => {
   res.render('meeting/add');
})

router.post('/add', async (req, res) => {
   var meeting = req.body;
   await MeetingModel.create(meeting);
   res.redirect('/meeting');
})

// router.get('/detail/:id', async (req, res) => {
//    var id = req.params.id;
//    //SQL: SELECT * FROM mobiles WHERE brand = "id"
//    var figures = await FigureModel.find({ brand : id }).populate('brand');
//    res.render('brand/detail', { figures })
// })

// router.get('/delete/:id', async (req, res) => {
//    var id = req.params.id;
//    //cách 1
//    try {
//       //SQL: DELETE FROM brands WHERE brand = id
//       await BrandModel.findByIdAndDelete(id);
//       console.log('Delete brand succeed !');
//    } catch (err) {
//       console.log('Delete brand fail. Error: ' + err);
//    };
//    res.redirect('/brand');
// })

// router.get('/deleteall', async (req, res) => {
//    //SQL: DELETE FROM brands
//    //     TRUNCATE TABLE brands
//    await BrandModel.deleteMany();
//    console.log('Delete all brand succeed !');
//    res.redirect('/brand');
// })

// router.get('/edit/:id', async (req, res) => {
//    var id = req.params.id;
//    var brand = await BrandModel.findById(id);
//    res.render('brand/edit', { brand });
// })

// router.post('/edit/:id', async (req, res) => {
//    var id = req.params.id;
//    var brand = req.body;
//    try {
//       //SQL: UPDATE brands SET A = B WHERE id = 'id'
//       await BrandModel.findByIdAndUpdate(id, brand);
//       console.log('update succeed !');
//    } catch (err) {
//       console.log('update failed. Error: ' + err);
//    }
//    res.redirect('/brand');
// })

module.exports = router;