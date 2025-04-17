import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    default: null
  },
  priceText: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['danggeun', 'bunjang', 'coupang'],
    index: true
  },
  category: {
    type: String,
    trim: true,
    index: true
  },
  location: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    trim: true
  },
  sellerName: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  productUrl: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  specs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for faster searches
ProductSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Product', ProductSchema);