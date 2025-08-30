// require('dotenv').config({path : './env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB()
    .then(()=>{
        app.listen(process.env.PORT || 8000, ()=>{
            console.log(`mogo db running on ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!!", err)
    })













/*
const app = express()

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI} / ${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("not listen");
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listining ${process.env.PORT}`);
        })
    }
    catch(error){
        console.log("ERROR :",)
    }
})()

*/