import { Router } from "express";
import { registerUser, logOutUser, loginUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        }, {
            name: "coverImage",
            maxCount: 1,
        }
    ]),
    registerUser);

router.route("/login").post(loginUser)
console.log("User router loaded");

//secured routes
router.route("/logout").post(verifyJWT, logOutUser) // two methods here thats why wrote next() in middleware


export default router;