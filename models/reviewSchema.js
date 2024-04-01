const mongoose=require('mongoose')
const User=require('../models/User')
const productSchema=require('../models/product')
const reviewSchema=new mongoose.Schema({
    rating:{
        type:Number,
        required:true,
        min:1,
        max:5
    },
    reviewText:{
        type:String,
        maxlength:1000
    },
    user:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true
    },
    product:{
        type:mongoose.Types.ObjectId,
        ref:"product",
        required:true
    }
    
})
reviewSchema.index({ user: 1, product: 1 }); // Example index on user and product fields
const review=mongoose.model('Review',reviewSchema)
module.exports=review