const mongoose = require('mongoose');
const category=require('../models/category')
const Schema = mongoose.Schema;

// Product schema 
const ProductSchema = new Schema({
    name: {
        type: String,
        unique: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    description: {
        type: String,
        required: true, 
        trim: true
    },
    stock:{
        type:Number,
        trim:true,
    },
    originalPrice:Number,
    price: {
        type: Number,
        trim: true,
        required: true
    },
    mainimage: String,
    additionalimages: Array,
    isPublished: {
        type: Boolean,
        default: true
    },
    discount:{
        type:Number,
        default:0
    },
    priceDifference:{
        type:Number,
        default:0
    }
    
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
