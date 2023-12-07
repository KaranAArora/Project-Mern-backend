import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.module.js";
import { UploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler (async (req, res) => {
    
    // Getting User Details from FrontEnd
    const { username, email , fullName, password } = req.body;

    // Checking Any Field provided by User is Null/Blank.
    if (
        [username,email,fullName, password].some(field => field?.trim() ==  "")
    ) {
        throw new ApiError(400 , "All Fields are Mandatory !!");
    }

    // Checking User Existing from DB, If Existing thrown Error.
    const checkExistingUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    if (checkExistingUser) {
        throw new ApiError(409 , "User Already exists with Username or Email !!");
    }

    console.log(req.files);

    //Getting local files Path of Files which is Uploded by Multer on Server.
   // const avatarLocalPath = req.files?.avatar?.[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let avatarLocalPath;
   if (req.files && req.files.avatar && req.files.avatar.length > 0) {
    avatarLocalPath = req.files.avatar[0].path;
  }
   console.log(avatarLocalPath);
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImageLocalPath.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
   }

    //Checking if Avatar is Uploded by User.
    if (!avatarLocalPath) {
        throw new ApiError(400 , "Avatar Image is Mandatory !!");
    }

    // Uploading Images on Cloudinary.
    const avatarOnCloudinary = await UploadonCloudinary(avatarLocalPath);
    const coverImageOnCloudinary = await UploadonCloudinary(coverImageLocalPath);

    // Checking Avatar Uploaded on Cloudinary.
    if (!avatarOnCloudinary) {
        throw new ApiError(400 , "Error While Uploading Image on Cloudinary !!");
    }
    // Creating User on DB.
    const newRegUser = await User.create(
        {
            username : username.toLowerCase(),
            email,
            fullName,
            password,
            avatar : avatarOnCloudinary.url,
            coverImage : coverImageOnCloudinary?.url || ""
        }
    )

    // Checking if User is Created in DB or Not
    const UserInDB = await newRegUser.findById(newRegUser._id).select(
        "-password -refreshToken"
    );

    // Thrown Error if New User Registered User Not found in DB.
    if (!UserInDB) {
        throw new ApiError(500 , "An Error Occured while Registering User!!")
    }
    // Returning Response/

    return res.status(201).json(
        new ApiResponse(
            200,
            UserInDB,
            "User Registered Successfully !!"
        )
    )

} );


export {registerUser}