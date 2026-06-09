const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'deodpj5sf',
  api_key: '846525728679281',
  api_secret: 'Y3IqsFh5SJNnV3lyrScGYb6eTug'
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vac-amc',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto'
  }
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };