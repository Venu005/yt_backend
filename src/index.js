import { app } from "./app";
import { PORT } from "./constants";
import dbConnect from "./db/connection";
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
