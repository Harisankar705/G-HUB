const mongoose=require('mongoose')
const walletSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.ObjectId,
        ref:"User",
        required:true
    },
    amount:{
        type:Number,
        default:0
    },
    transactionHistory:{
        type:Array
    }
})

const wallet=mongoose.model('wallet',walletSchema)
module.exports=wallet