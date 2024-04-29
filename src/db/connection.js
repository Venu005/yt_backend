import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
//TODO: npm i mongoose
const dbConnect = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log(connectionInstance.connection.host);
    const connection = mongoose.connection;
    //console.log(connection.readyState); if ready satate is 1 then connected
    connection.on("connected", () => {
      console.log("DB Connection successful");
    });
    connection.on("error", () => {
      console.log("DB Connection failed");
    });
  } catch (error) {
    console.log("Error in connecting to database");
    process.exit(1);
  }
};

export default dbConnect;
