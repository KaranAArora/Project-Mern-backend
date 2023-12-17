import { Router } from "express";
import { loginUser, logoutUser, refeshAccessToken, registerUser } from "../controllers/user.contoller.js";
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


export default router