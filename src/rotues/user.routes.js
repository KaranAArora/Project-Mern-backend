import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWathcHistory, loginUser, logoutUser, refeshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.contoller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

//Register User Route
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImange",
            maxCount : 1
        }
    ]),
    registerUser
    );

//Login User Route
router.route("/login").post(loginUser);

//---Secure Routes ---

//Logout User Route
router.route("/logout").post(verifyJWT, logoutUser);

//Refresh Access Token Route
router.route("/refresh-token").post(refeshAccessToken);

// Change Password Route
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

//Get Current User Route
router.route("/current-user").get(verifyJWT, getCurrentUser);

//Update Account Details Route
router.route("/update-acct-det").patch(verifyJWT, updateAccountDetails);

//Update Avatar Image Route
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

//Update Cover Image Route
router.route("/update-coverimg").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

//Get User channel Profile
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

//Get User Watch History
router.route("/user-watchHistory").get(verifyJWT, getUserWathcHistory);

export default router