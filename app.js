import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import userRouter from "./routes/users/user.js";
import cors from 'cors';
import path from 'path';
import pokerLogic from './poker.js';
import errorhendler from "./error.js";

const app = express();
const port = 5000; // Railway-ს პორტი
const server = createServer(app); // HTTP სერვერი

// ✅ დაამატე ეს CORS Middleware
app.use(cors({
  origin: ['https://poker-club-neon.vercel.app'], // შენი Frontend-ის დომენი
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));
app.use(express.json());
app.use("/api/", userRouter);
app.use('/cards', express.static(path.join('cards')));
app.use(errorhendler);


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



