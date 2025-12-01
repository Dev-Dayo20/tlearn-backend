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
  storage, // Memory storage - no disk writes!
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});
