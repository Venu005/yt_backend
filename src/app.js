import express from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
//TODO: npm i cors cookie-parser
app.use(cors()); //has options too
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(
  express.urlencoded({
    extended: true, //nested objects
    limit: "16kb",
  })
);

app.use(express.static("public")); // static files from public folder
app.use(cookieParser());
