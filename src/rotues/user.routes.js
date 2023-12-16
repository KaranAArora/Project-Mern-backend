import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.contoller.js";
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

//Logout User Route
router.route("/logout").post(verifyJWT, logoutUser);


export default router