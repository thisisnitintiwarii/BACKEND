// register user steps
// 1 get user details from frontEnd (Postman) 
// 2 validation - each validation should be checked (not empyt())
// 3 check if user is already exists : check username , email
// 4 check for images check for avatar 
// 5 upload them to cloudinary, avatar
// 6 create user object ->(NoSQL DB) create entry in DB
// 7 remove password and refresh token feild 
// 8 check fro user creation 
// 9 return response



import { ApiError } from "../utils/ApiError.js"

import { asyncHandler } from "../utils/asyncHandler.js"

import { User } from "../models/user.model.js"

import { ApiResponse } from "../utils/ApiResponse.js"

import { uploadOnCloudinary } from "../utils/cloudinary.js"



const registerUser = asyncHandler(async (req, res) => {

    const { username, fullName, email, password } = req.body

    console.log("email", email);

    if ([fullName, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All field are required")
    }


    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })



    if (existedUser) {
        throw new ApiError(409, "User with email or username is already exists");
    }

    // files access because of multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required");
    }


    // upload them into cloudinary 

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    // check avatar is their or not

    if (!avatar) {
        throw new ApiError(400, "avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    //check user is created or not 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registring the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

export { registerUser }