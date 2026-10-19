import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js"

const MONGODB_NAME = "hirebridge";

mongoose.set("strictQuery", true);

// Reuses one connection per process (important on serverless hosts, where warm
// invocations share the process)
let connecting = null;

const connectdb = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (!connecting) {
        connecting = mongoose
            .connect(process.env.MONGODB_URI, { dbName: MONGODB_NAME, serverSelectionTimeoutMS: 10000 })
            .then(() => {
                console.log("Connection to database succesfull");
                return mongoose.connection;
            })
            .catch((error) => {
                connecting = null;
                throw new ApiError(500, `Error while connecting to database: ${error.message}`);
            });
    }
    return connecting;
};

export {connectdb};