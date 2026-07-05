const { v2: cloudinary } = require('cloudinary');
const config = require('../config');

if (config.cloudinaryConfigured) {
  if (config.cloudinary.url) {
    // The SDK auto-reads CLOUDINARY_URL from the environment; calling config()
    // with secure ensures https URLs are returned.
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }
}

// Uploads an in-memory image buffer to Cloudinary and resolves the secure URL.
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || config.cloudinary.folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer };
