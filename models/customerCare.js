const mongoose=require('mongoose')
const customerCareSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phonenumber:{
        type:Number,
        required:true
    },
    subject:{
        type:String,
        required:true
    }
})
module.exports = mongoose.model('CustomerCare', customerCareSchema);
