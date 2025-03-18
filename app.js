import express, { json } from 'express';
import userRouter from "./routes/users/user.js";
import cors from 'cors';
import pokerLogic from './poker.js';
import path from 'path'

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use("/api/", userRouter);



app.use('/cards', express.static(path.join( 'cards')));

app.get("/health", (req, res) => {
  res.send("✅ Server is running!");
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});



  pokerLogic();



app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`);
});
