import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import userRouter from "./routes/users/user.js";
import cors from 'cors';
import path from 'path';
import pokerLogic from './poker.js';
import dotenv from "dotenv"
dotenv.config()

const app = express();
const port = process.env.PORT || 5000; // Railway-ს პორტი
const server = createServer(app); // HTTP სერვერი

app.use(cors());
app.use(express.json());
app.use("/api/", userRouter);
app.use('/cards', express.static(path.join('cards')));

app.get("/health", (req, res) => {
  res.send("✅ Server is running!");
});

// ✅ WebSocket-ის მიბმა HTTP სერვერზე
const wss = new WebSocketServer({ server });

pokerLogic(wss); // ვაწვდით WebSocket სერვერს ლოგიკას

// HTTP სერვერის გაშვება
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});



