// File: backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import puppeteer from 'puppeteer';
import process from 'process';

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
app.use(express.json());

// Mount routes
app.use('/api/comparison', comparisonRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);

// Start server and Puppeteer
const start = async () => {
  try {
    // Launch a single shared browser instance
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-spdy'
      ],
    });

    // Make browser available via request handlers
    app.locals.browser = browser;

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');

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
  // Close Puppeteer
  if (app.locals.browser) {
    try {
      await app.locals.browser.close();
      console.log('Browser closed');
    } catch (e) {
      console.error('Error closing browser', e);
    }
  }
  // Disconnect MongoDB
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (e) {
    console.error('Error disconnecting MongoDB', e);
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
