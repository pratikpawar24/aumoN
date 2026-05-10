const multer = require('multer');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Avatar must be JPEG, PNG, or WebP'));
    }
    cb(null, true);
  },
}).single('avatar');

// Wrap multer to surface its errors as JSON instead of HTML.
const handleAvatarUpload = (req, res, next) => {
  avatarUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 5 MB.' });
    }
    return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
  });
};

module.exports = { handleAvatarUpload };
