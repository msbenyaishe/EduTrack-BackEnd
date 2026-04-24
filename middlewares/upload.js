const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Keep this list broad: phones often upload HEIC/HEIF, and some users use GIF.
const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const hasCloudinaryConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

// On Vercel / production serverless, writing to disk is not reliable.
const isServerlessProd = !!process.env.VERCEL || process.env.NODE_ENV === "production";

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: "edutrack_profiles",
        resource_type: "auto",
        public_id: (req, file) => {
          const base = path.parse(file.originalname).name || "profile";
          return `profile_${Date.now()}_${base}`;
        },
      },
    })
  : isServerlessProd
    ? null
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, "..", "uploads");
        try {
          fs.mkdirSync(uploadsDir, { recursive: true });
          return cb(null, uploadsDir);
        } catch (e) {
          return cb(e);
        }
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        cb(null, `profile_${Date.now()}${ext}`);
      },
    });

const fileFilter = (req, file, cb) => {
  const isImageMime = typeof file.mimetype === "string" && file.mimetype.startsWith("image/");
  // Some browsers/devices upload with filename "blob" (no extension). Allow based on MIME type in that case.
  const ext = path.extname(file.originalname || "").slice(1).toLowerCase();
  const hasExt = !!ext;
  const isAllowedExt = !hasExt || ALLOWED_IMAGE_FORMATS.includes(ext);

  if (!isImageMime || !isAllowedExt) {
    const err = new Error(
      `Unsupported image type. Allowed: ${ALLOWED_IMAGE_FORMATS.join(", ")}`
    );
    err.code = "UNSUPPORTED_IMAGE_TYPE";
    return cb(err);
  }
  return cb(null, true);
};

let upload;

if (!storage) {
  // Serverless prod without Cloudinary credentials: fail fast with a clear error.
  upload = {
    single: () => (req, res, next) => {
      const err = new Error(
        "Image upload is not available in production until Cloudinary environment variables are set on Vercel."
      );
      err.code = "CLOUDINARY_NOT_CONFIGURED";
      next(err);
    },
  };
} else {
  upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
  });
}

module.exports = upload;
