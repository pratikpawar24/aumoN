const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config/env');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
const PUBLIC_PREFIX = '/uploads/avatars';

const ensureDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const extFromMime = (mime) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

let cloudinaryClient = null;
const getCloudinary = () => {
  if (!config.cloudinaryUrl) return null;
  if (cloudinaryClient) return cloudinaryClient;
  try {
    // Lazy-require so missing dep doesn't break boot.
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({ secure: true }); // CLOUDINARY_URL is auto-read from env
    cloudinaryClient = cloudinary;
    return cloudinary;
  } catch (e) {
    console.warn(
      '⚠️  CLOUDINARY_URL set but `cloudinary` package not installed. ' +
      'Run `npm install cloudinary` to enable cloud uploads. Falling back to disk.'
    );
    return null;
  }
};

const isCloudinaryEnabled = () => Boolean(getCloudinary());

const uploadAvatar = async ({ buffer, mimetype, userId }) => {
  const cloudinary = getCloudinary();

  if (cloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'aumo/avatars',
          public_id: String(userId),
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (err, result) => {
          if (err) return reject(err);
          resolve({ url: result.secure_url, storage: 'cloudinary' });
        }
      );
      stream.end(buffer);
    });
  }

  // Disk fallback
  ensureDir();
  const ext = extFromMime(mimetype);
  const random = crypto.randomBytes(6).toString('hex');
  const filename = `${userId}-${random}.${ext}`;
  const fullPath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(fullPath, buffer);
  return { url: `${PUBLIC_PREFIX}/${filename}`, storage: 'disk' };
};

module.exports = {
  uploadAvatar,
  isCloudinaryEnabled,
  UPLOADS_DIR,
  PUBLIC_PREFIX,
};
