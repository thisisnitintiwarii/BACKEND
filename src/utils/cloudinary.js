// read local file and store in cloudinary 
// and remove file from server once it uploaded on cloudinary successfully
// fs as file system -> help to read write remove

import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload the file on cloudinary

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })

        //file has been uploaded successfully on cloudinary
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // removes the locally saved file as the file is failed to upload
    }
}

export { uploadOnCloudinary };