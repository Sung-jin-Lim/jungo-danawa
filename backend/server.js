// File: backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import process from 'process';

// Services
import { browserManager } from './services/browserManager.js';

// API Routes
import comparisonRoutes from './api/routes/comparisonRoutes.js';
import geminiRoutes from './api/routes/geminiRoutes.js';
import searchRoutes from './api/routes/searchRoutes.js';
import productRoutes from './api/routes/productRoutes.js';

dotenv.config();

const app = express();

// Enable CORS for local frontend
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));

// JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes
app.use('/api/comparison', comparisonRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);

// Health check route
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Start server and Puppeteer
const start = async () => {
  try {
    // Launch a browser instance through our manager
    const browser = await browserManager.getBrowser();
    console.log('Browser launched successfully');

    // Optional MongoDB connection (only if MONGODB_URI is set)
    if (process.env.MONGODB_URI) {
      try {
        const mongoose = await import('mongoose');
        await mongoose.default.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
      } catch (dbErr) {
        console.warn('MongoDB connection failed:', dbErr.message);
        console.warn('Continuing without database support. Some features may not work.');
      }
    } else {
      console.log('No MONGODB_URI provided. Running without database support.');
    }

    // Start listening
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  // Close all browsers
  try {
    await browserManager.closeAll();
    console.log('All browsers closed');
  } catch (e) {
    console.error('Error closing browsers', e);
  }

  // Disconnect MongoDB if connected
  if (process.env.MONGODB_URI) {
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.disconnect();
      console.log('MongoDB disconnected');
    } catch (e) {
      console.error('Error disconnecting MongoDB', e);
    }
  }

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
