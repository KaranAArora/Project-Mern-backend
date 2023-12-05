import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY , 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const UploadonCloudinary = async function (localFliePath){
    try {
        if (!localFliePath) return null
        //Upload on Cloudinary 
        const response = await cloudinary.uploader.upload(localFliePath , {
            resource_type : auto
        }) 
        // File Uploaded Successfully
       // console.log("File is Uploded Successfullly on Cloudinary", response.url);
       fs.unlinkSync(localFliePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFliePath) // Remove the File from Local Serer which was saved temp onoperation Fail.
        return null;
    }
}


export { UploadonCloudinary }