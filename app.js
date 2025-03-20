import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import userRouter from "./routes/users/user.js";
import cors from 'cors';
import path from 'path';


const app = express();
const port = process.env.PORT || 5000; // Railway ღიას ტოვებს მხოლოდ PORT-ს
const serverr = createServer(app); // HTTP სერვერი Express-სთვის

app.use(cors());
app.use(express.json());
app.use("/api/", userRouter);
app.use('/cards', express.static(path.join('cards')));

app.get("/health", (req, res) => {
  res.send("✅ Server is running!");
});

// ✅ WebSocket-ის მიბმა HTTP სერვერზე
const server = new WebSocketServer({ serverr });
export default server


serverr.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});



