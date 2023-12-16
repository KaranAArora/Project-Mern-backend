import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.module.js";
import { UploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//Creating Tokens Method
const generateAccessTokenAndRefreshTokens = async(userId) => {
    try {
        const user =  User.findById(userId);
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

export {
    registerUser,
    loginUser,
    logoutUser
}