import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();
import { setupWebSocket } from './ws/debateSocket';

const app = express();
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', message: 'PhilosophOS server running' });
});

const server = http.createServer(app);
setupWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🧠 PhilosophOS server running on port ${PORT}`);
});
