const router = require('express').Router();
const { upload, cloudinary } = require('../cloudinary');
const { auth } = require('../middleware/auth');

router.post('/', auth, upload.single('file'), (req, res) => {
  try {
    res.json({
      url: req.file.path,
      public_id: req.file.filename,
      name: req.file.originalname
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:public_id', auth, async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params.public_id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;