import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.module.js";
import { UploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//Creating Tokens Method
const generateAccessTokenAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        // Generating Token using User Module Methods
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //Setting refresh Token value in User
        user.refreshToken = refreshToken;
        //Save in DB against User
        await user.save({ validateBeforeSave : false });

        return { accessToken , refreshToken }

    } catch (error) {
        throw new ApiError(500, "Error while Generating Tokens !!")
    }
};

//Registering New User logic
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

    //console.log(req.files);

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
    const UserInDB = await User.findById(newRegUser._id).select(
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

// User Login Logic
const loginUser = asyncHandler(async (req, res) => {

    //Getting Data from Body
    const {username, email, password } = req.body;

    // Checking Null for Username and Email
    if (!(username || email )) {
        throw new ApiError (400 , "Invalid Username or Email !!");
    }

    // Check User in DB
    const loginUserDB = await User.findOne({
        $or: [{username}, {email}]
    });

    //If User not found in DB, Throw Error
    if (!loginUserDB) {
        throw new ApiError(404, "User does not Exist !!");
    }

    // Checking password
    const isPasswordValid = await loginUserDB.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Inavlid User Password !!");
    }

    //Generate tokens and store in a Var using Method (generateAccessTokenAndRefreshTokens)
    const { accessToken , refreshToken } = await generateAccessTokenAndRefreshTokens(loginUserDB._id);

    //Getting Updated deatils from DB for User
    const loggedInUser = await User.findById(loginUserDB._id).select("-password -refreshToken");

    //Creating Object for cookies
    const options = {
        httpOnly: true,
        secure: true
    };


    //Return status
    return res
        .status(200)
        .cookie("accessToken", accessToken , options) // setting acessToken Cookie
        .cookie("refreshToken", refreshToken , options) // Setting refreshToken Cookie
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Successfully Logged In !!"
            )
        )

});

//User Logout Logic
const logoutUser = asyncHandler(async (req, res) => {
    //Updating Refresh Token in DB
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User LoggedOut Successfully !!"
            )
        )


});

//User RefeshAccessToken Logic
const refeshAccessToken = asyncHandler(async (req, res) =>{

    //Getting Token from cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "UnAuthorization Request !!");
    }

    try {
        //Decoding Token Using JWT.
        const decodedIncomingToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
    
        // Finding Decoded User in DB
        const user = await User.findById(decodedIncomingToken?._id);
    
        if (!user) {
            throw new ApiError (401, "Invalid Refresh Token !! ");
        }
    
        //Verifing Token from user and Token in DB
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError (401, "Refresh Token is Expired or Used !! ");
        }
    
        //Declaring Cookies Options
        const options ={
            httpOnly: true,
            secure: true
        }
    
        //Generating Tokens Using Method (generateAccessTokenAndRefreshTokens)
        const { newaccessToken , newrefreshToken } = await generateAccessTokenAndRefreshTokens(user._id);
    
        //Returning Response
        return res
            .status(200)
            .cookies("accessToken", newaccessToken, options)
            .cookies("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: newaccessToken,
                        refreshToken: newrefreshToken
                    },
                    "Access Token Refreshed Successfully !!"
                )
    
            )
    } catch (error) {
        console.log("In RefeshAccessToken Logic Catch !!");
        throw new ApiError(401, error?.message || "Invalid Refresh Token !!");
    }
});

//User Change Current Password Logic
const changeCurrentPassword = asyncHandler(async(req, res) =>{
    //Getting Data from Body/Frontend
    const {oldPassword, newPassword } = req.body;

    //Getting User Id from DB.
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(400, "Invalid User Id !!");
    }

    //Decoding Password and Checking
    const checkOldPasswordwithDB = user.isPasswordCorrect(oldPassword);

    if (!checkOldPasswordwithDB) {
        throw new ApiError(400, "Invalid Old Password !!");
    }

    //Replacing Old Password With New Password
    user.password = newPassword;

    //Upadting in DB
    await user.save({validateBeforeSave : false});

    // Returning Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password Changed Successfully !!"
            )
        )

});

//Get Current User Logic
const getCurrentUser = asyncHandler(async(req, res) => {
    // Returning Response Using middleware
    return res
        .status(200)
        .json(
            new ApiResponse
            (200,
            req.user,
            "Current User Fetched Successfully !!"
            )
        )
});

//Update User Account Details Logic
const updateAccountDetails = asyncHandler(async (req, res) =>{
    //Getting Data from Body
    const {fullName, email} = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All Fields are Mandatory !!");
    }

    const UpdateData = await User.findByIdAndUpdate(
        req?.user._id,
        {
            $set :{
                fullName,
                email
            }
        },
        {new : true }
        ).select("-password");

     // Returning Response
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "Data Updated Successfully !!"
        ))
});

//Update Avatar Logic
const updateUserAvatar = asyncHandler(async(req, res) =>{
    // Getting Image from Body
    const localImgPath = req.file?.path

    if (!localImgPath) {
        throw new ApiError(400, "Image is Mandatory !!");
    }
    // Upload Image on Cloudinary
    const newAvatar = await UploadonCloudinary(localImgPath);

    if (!newAvatar.url) {
        throw new ApiError(500, "Error while Uploading New Avatar !!");
    }

    //Updating in DB
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                avatar : newAvatar.url
            }
        },
        {new : true}
    ).select("-password")

    // Returning Response
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "New Avatar Updated Succefully !!"
        ))
});

//Update CoverAvatar Logic
const updateUserCoverImage = asyncHandler(async(req, res) =>{
    // Getting Image from Body
    const localImgPath = req.file?.path

    if (!localImgPath) {
        throw new ApiError(400, "Image is Mandatory !!");
    }
    // Upload Image on Cloudinary
    const newCoverImage = await UploadonCloudinary(localImgPath);

    if (!newCoverImage.url) {
        throw new ApiError(500, "Error while Uploading New Cover Image !!");
    }

    //Updating in DB
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                coverImage : newCoverImage.url
            }
        },
        {new : true}
    ).select("-password")

    //Returning Response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Cover Image Updated Successfully !!"
            )
        )
});


//Export
export {
    registerUser,
    loginUser,
    logoutUser,
    refeshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}