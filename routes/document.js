const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const multer = require('multer');
const path = require('path');
// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, './public/uploads/'); // Chỉ định thư mục lưu trữ file tải lên
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Đặt tên file là thời gian hiện tại
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
      const filetypes = /pdf|doc|docx/; // Hạn chế chỉ cho phép file PDF và Word
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);

      if (mimetype && extname) {
          return cb(null, true);
      }
      cb(new Error('Chỉ chấp nhận các file PDF, DOC, DOCX'));
  }
});

// Hiển thị trang quản lý tài liệu
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find(); // Lấy tất cả tài liệu từ database
    res.render('document/index', { title: 'Quản lý tài liệu', documents });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server khi lấy danh sách tài liệu');
  }
});

// Hiển thị trang thêm tài liệu
router.get('/add', (req, res) => {
    res.render('document/add');
});

// Xử lý thêm tài liệu
router.post('/add', upload.single('documentFile'), async (req, res) => {
  const { title, author, content } = req.body;
  const documentFile = req.file ? '/uploads/documents/' + req.file.filename : '';

  const newDocument = new Document({ 
      title, 
      author, 
      content, 
      imageUrl: req.body.imageUrl, // nếu có ảnh
      documentFile // Thêm file tải lên
  });

  await newDocument.save();
  res.redirect('/document');
});

// Xử lý tìm kiếm tài liệu
router.get('/search', async (req, res) => {
    const query = req.query.query;
    const documents = await Document.find({ title: new RegExp(query, 'i') });
    res.render('document/index', { documents });
});

// Edit document route
router.get('/edit/:id', async (req, res) => {
  try {
      const documentId = req.params.id;
      const document = await Document.findById(documentId);

      if (!document) {
          return res.status(404).send('Document not found');
      }

      res.render('document/edit', { document });
  } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).send('Internal Server Error');
  }
});
// Update document route
router.post('/update/:id', upload.single('documentFile'), async (req, res) => {
  try {
      const documentId = req.params.id;
      const { title, author, content, imageUrl } = req.body;

      // Nếu có file tải lên, lưu URL của file vào document
      let documentFileUrl = null;
      if (req.file) {
          documentFileUrl = `/uploads/${req.file.filename}`;
      }

      await Document.findByIdAndUpdate(documentId, {
          title,
          author,
          content,
          imageUrl,
          documentFile: documentFileUrl // Cập nhật URL file
      });

      res.redirect('/document'); // Redirect to document list page
  } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Xử lý xóa tài liệu với phương thức POST
router.delete('/delete/:id', async (req, res) => {
  try {
      await Document.findByIdAndDelete(req.params.id);
      res.redirect('/document');
  } catch (error) {
      console.error('Lỗi khi xóa tài liệu:', error);
      res.status(500).send('Lỗi máy chủ nội bộ');
  }
});

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
  }
  res.redirect('/auth/login'); // Nếu chưa đăng nhập, chuyển hướng về trang đăng nhập
};

// Hiển thị trang danh sách tài liệu với bình luận
router.get('/mainDocument', async (req, res) => {
  try {
      const documents = await Document.find().populate('comments.user', 'username'); // Lấy dữ liệu bình luận kèm tên user
      res.render('document/mainDocument', { documents, user: req.user });
  } catch (error) {
      console.error('Lỗi lấy dữ liệu:', error);
      res.status(500).send('Lỗi máy chủ ha ');
  }
});

// Thêm bình luận vào tài liệu (chỉ người đăng nhập mới có thể bình luận)
router.post('/comment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.id;
    const user = req.user; // Assuming you have user authentication
    const { text } = req.body;

    const document = await Document.findById(documentId);
    if (!document) {
        return res.status(404).send('Document not found');
    }

    const comment = {
        username: user.fullname, // Use the fullname of the user
        text
    };
      document.comments.push(comment);
      await document.save();

      res.redirect('/document/mainDocument'); // Reload lại trang 
  } catch (error) {
      console.error('Lỗi khi bình luận:', error);
      res.status(500).send('Lỗi máy chủ ');
  }
});





module.exports = router;