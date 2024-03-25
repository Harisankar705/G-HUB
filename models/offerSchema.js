const mongoose=require('mongoose')
const offerSchema=new mongoose.Schema({
    offerName:{type:String},
    discountOn:{type:String},
    discountValue:{type:Number},
    endDate:{type:Date},
    selectedCategory:{
        type:mongoose.Schema.Types.ObjectId,
            ref:"Category"
        },
        selectedProducts:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product"
        },
    isActive:{
        type:Boolean,
    },
    // referralRewardValue:{
    //     type:Number,
    //     default:0
    // },
    // refreeRewardValue:{
    //     type:Number,
    //     default:0
    // },
    // referrer:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    // referee:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}]
})
const offer=mongoose.model('offers',offerSchema)
module.exports=offer