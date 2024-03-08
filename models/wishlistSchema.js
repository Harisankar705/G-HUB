const mongoose=require('mongoose')
const productSchema=require('../models/product')
const userSchema=require('../models/User')

const wishlistSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.ObjectId,
        required:true
    },
    products:[{
        productId:{
            type:mongoose.Schema.ObjectId,
            ref:"Product",
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }]

})
const wishlist=mongoose.model('wishlist',wishlistSchema)
module.exports=wishlist
