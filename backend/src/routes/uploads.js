const express = require('express');
const multer = require('multer');
const config = require('../config');
const { uploadBuffer } = require('../lib/cloudinary');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

// Keep files in memory (max 5 MB) and stream straight to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  },
});

// POST /api/uploads — upload one item image (auth required)
router.post('/', requireVendor, (req, res) => {
  if (!config.cloudinaryConfigured) {
    return res.status(503).json({
      error: 'Image uploads are not configured. Set CLOUDINARY_URL in the backend .env.',
    });
  }

  upload.single('image')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large (max 5 MB).'
        : err.message || 'Upload failed.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }
    try {
      const result = await uploadBuffer(
        req.file.buffer,
        `${config.cloudinary.folder}/${req.vendor.vendor_id}`
      );
      return res.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (uploadErr) {
      console.error('Cloudinary upload error:', uploadErr);
      return res.status(502).json({ error: 'Could not upload image. Please try again.' });
    }
  });
});

module.exports = router;
