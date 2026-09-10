import multer from "multer";

// Store in memory (not disk) - no uploads/ folder needed!
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// File filter for videos
const videoFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /mp4|mpeg|quicktime|x-msvideo|x-ms-wmv|webm|mkv|avi|mov/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = file.mimetype.startsWith("video/");

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"));
  }
};

export const uploadVideo = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: videoFilter,
});
