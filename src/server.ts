import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import api_routes from './routes/index';

dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));

const io = new Server(server, {
    cors: corsOptions,
});

import { setupSocketHandlers } from './socket/socket';
setupSocketHandlers(io);

app.set('trust proxy', 1);
app.set('socketio', io);

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '5mb' }));
app.use(bodyParser.text({ limit: '5mb' }));
app.use(bodyParser.raw({ limit: '5mb' }));

app.use("/", api_routes);

const PORT = process.env.PORT;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

export default app;
