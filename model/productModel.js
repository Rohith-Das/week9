const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  stockQuantity: { type: Number, required: true },
  images: { type: [String], required: true },
  imageUrl: String,
  is_deleted: { type: Boolean, default: true },
  warrantyPeriod: { type: String, required: true },
  waterResistance: { type: String, required: true },
  
  shape: { type: String, required: true },
  thickness: { type: Number, required: true },
  
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
