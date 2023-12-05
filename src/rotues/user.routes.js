import { Router } from "express";
import { registerUser } from "../controllers/user.contoller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router()

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

export default router