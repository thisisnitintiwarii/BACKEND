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

import { User } from "../models/user.model.js";

import { ApiResponse } from "../utils/ApiResponse.js"

import { uploadOnCloudinary } from "../utils/cloudinary.js"

import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //refresh ko DB dalna hai 

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        // validateBeforeSave is used to remove all checkpoint while addeing somthing to the user like requied true things become false

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "some thing went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { username, fullName, email, password } = req.body

    if ([fullName, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All field are required")
    }

    // if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })


    if (existedUser) {
        throw new ApiError(409, "User with email or username is already exists");
    }


    // files access because of multer

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


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

    //create object in mongoDB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })


    //check user is created or not  remove password and token in response
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

// To do for login User

// get the username emial passwrod from the frontEnd
// check that if one of the feild is empty 
// check for the user is  is already present in the Db
// if YES rdirect to the login page  generate access and refresh token
// send cookie tokens

const loginUser = asyncHandler(async (req, res) => {


    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    //find user in DB
    const user = await User.findOne({
        $or: [{ username }, { email }],
    })

    if (!user) {
        throw new ApiError(404, "user does not exists")
    }


    // if user found check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "invalid user credintials")
    }

    // create access and refresh tokens 

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // send in to cookie 

    // either update the user or do one more query to find user so that function token updated user 

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send cookies 
    const options = {
        httpOnly: true, // by using http and secure only server can modify the cookies
        secure: true,
    }

    return res.
        status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            }), "User loggedIn Successfully"
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    console.log("logOutUser called");

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true //if return undefied it is returned
        }
    )

    const options = {
        httpOnly: true, // by using http and secure only server can modify the cookies
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, {}, "user logged Out")
    )
})

// refresh access token 
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, options).cookie("newrefresToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newrefreshToken }, "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        200, req.user, "current user fetched succesfully"
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "all feilds are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        }, {
        new: true // update hone ke baad jo info return hoti hai user ko 
    }
    ).select("-password ");
    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    )

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    // upate the files to user

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, {
        new: true
    }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cloudinary")
    }

    // upate the files to user

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        }, {
        new: true
    }
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.prams;
    if (!username.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }
        ,
        {
            $lookup: {
                from: "subsriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            $lookup: {
                from: "subsriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false,
                    }
                }

            }
        }
        ,
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }

    ])


    if (!channel?.length) {
        throw new ApiError(400, "channel does not exsts")
    }

    return res.status(200).json(
        200,
        channel[0], "channel is exists"
    )

})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}