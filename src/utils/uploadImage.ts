import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

export const uploadToCloudinary = async (
  file: Express.Multer.File,
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
      },
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    Readable.from(file.buffer).pipe(uploadStream);
  });
};

interface VideoUploadOptions {
  schoolId: number;
  title: string;
}

interface VideoUploadResult {
  secure_url: string;
  duration?: number;
  public_id: string;
  format: string;
}

export const uploadVideoToCloudinary = async (
  file: Express.Multer.File,
  options: VideoUploadOptions,
): Promise<VideoUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: `tlearn/schools/${options.schoolId}/videos`,
        public_id: `${options.title.replace(/\s+/g, "-")}-${Date.now()}`,
        eager: [
          {
            streaming_profile: "hd",
            format: "m3u8", // HLS streaming
          },
          {
            quality: "auto",
            format: "mp4", // Fallback MP4
          },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary video upload error:", error);
          reject(new Error("Failed to upload video to Cloudinary"));
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            duration: result.duration,
            public_id: result.public_id,
            format: result.format,
          });
        } else {
          reject(new Error("No result from Cloudinary"));
        }
      },
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    Readable.from(file.buffer).pipe(uploadStream);
  });
};

// Optional: Delete video from Cloudinary
export const deleteVideoFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    console.error("Failed to delete video from Cloudinary:", error);
    throw new Error("Failed to delete video");
  }
};
