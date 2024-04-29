import { app } from "./app.js";
import { PORT } from "./constants.js";
import dbConnect from "./db/connection.js";
import dotenv from "dotenv";
///TODO: npm i dotenv
dotenv.config({
  path: "./env",
});
dbConnect()
  .then(() => {
    app.listen(PORT || 3000, () => {
      console.log(`Listening at @ ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("DB connection failed", err);
  });
