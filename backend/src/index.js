import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { connectDB } from './lib/db.js';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import friendRoutes from './routes/friend.route.js';
import { app, server } from './lib/socket.js';

const PORT = process.env.PORT;

app.set('trust proxy', 1);

// Tambahkan limit agar bisa kirim data besar (seperti gambar base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];
      if (!origin || allowed.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);

server.listen(PORT, () => {
  console.log('Server is running on PORT: ' + PORT);
  connectDB();
});
