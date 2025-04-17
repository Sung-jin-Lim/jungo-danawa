// File: backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Import routes
import comparisonRoutes from './api/routes/comparisonRoutes.js';
import geminiRoutes from './api/routes/geminiRoutes.js';
import searchRoutes from './api/routes/searchRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jungo-danawa';

// Enable CORS for all origins (or restrict to frontend URL)
app.use(cors({ origin: 'http://localhost:3000' }));
// Parse JSON request bodies
app.use(express.json());

// Mount API routes
app.use('/api/comparison', comparisonRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/search', searchRoutes);

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
