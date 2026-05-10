require('dotenv').config();
const { validateEnv, config } = require('./src/config/env');
validateEnv();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const connectDB = require('./src/config/db');
const corsMiddleware = require('./src/config/cors');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ── Socket.IO for real-time updates ─────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: config.frontendUrl, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-carpool-room', (matchId) => {
    socket.join(`carpool_${matchId}`);
  });

  socket.on('join-chat-room', (rideId) => {
    socket.join(`chat_${rideId}`);
  });

  socket.on('leave-chat-room', (rideId) => {
    socket.leave(`chat_${rideId}`);
  });

  socket.on('route-update', (data) => {
    socket.broadcast.emit('route-updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible in controllers
app.set('io', io);

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(apiLimiter);

// Serve avatars uploaded to disk (no-op when Cloudinary is configured).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AUMO Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'AUMO API v2.0 - Urban Mobility Optimizer', docs: '/health' });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./src/routes/authRoutes'));
app.use('/api/routes',    require('./src/routes/routeRoutes'));
app.use('/api/trips',     require('./src/routes/tripRoutes'));
app.use('/api/carpool',   require('./src/routes/carpoolRoutes'));
app.use('/api/chat',      require('./src/routes/chatRoutes'));
app.use('/api/map',       require('./src/routes/mapRoutes'));
app.use('/api/traffic',   require('./src/routes/trafficRoutes'));
app.use('/api/emissions', require('./src/routes/emissionRoutes'));
app.use('/api/ai',        require('./src/routes/aiRoutes'));

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  server.listen(config.port, () => {
    console.log(`\n🚀 AUMO Backend running on port ${config.port}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`🤖 AI Service: ${config.aiServiceUrl}`);
    console.log(`🎨 Frontend: ${config.frontendUrl}\n`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server };