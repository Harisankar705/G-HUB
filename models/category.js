const mongoose = require("mongoose");
const ProductSchema = require("../models/product");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // Use singular form here
    },
  ],
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
