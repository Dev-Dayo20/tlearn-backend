import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

export const uploadToCloudinary = async (
  file: Express.Multer.File
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tlearn/schools",
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "limit" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error("Failed to upload image to Cloudinary"));
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error("No result from Cloudinary"));
        }
      }
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    Readable.from(file.buffer).pipe(uploadStream);
  });
};
