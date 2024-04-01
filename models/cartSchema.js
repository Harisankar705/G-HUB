const mongoose = require("mongoose");
const productSchema = require("../models/product");
const userSchema = require("../models/User");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
        required: true,
      },

      quantity: {
        type: Number,
        default: 1,
        required: true,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
  ],
});

const cart = mongoose.model("cart", cartSchema);
module.exports = cart;
