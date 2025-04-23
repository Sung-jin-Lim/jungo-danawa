// File: backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import puppeteer from 'puppeteer';


// Load environment variables
dotenv.config();

// Import routes
import comparisonRoutes from './api/routes/comparisonRoutes.js';
import geminiRoutes from './api/routes/geminiRoutes.js';
import searchRoutes from './api/routes/searchRoutes.js';
import productRoutes from './api/routes/productRoutes.js';


async function start() {
  const app = express();
  const PORT = process.env.PORT || 5000;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jungo-danawa';

  // launch shared browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  app.locals.browser = browser;

  // CORS + JSON
  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(express.json());

  // Mount your routes
  app.use('/api/comparison', comparisonRoutes);
  app.use('/api/gemini', geminiRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/products', productRoutes);

  // Connect to DB & listen
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
