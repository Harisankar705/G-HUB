const mongoose = require("mongoose");
const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
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

module.exports = mongoose.model("Brand", brandSchema);
