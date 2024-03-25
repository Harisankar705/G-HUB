const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// User schema 
const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    address: [{
        username:String,
        houseaddress: String,
        city: String,
        pincode: Number,
        district: String, // Corrected from 'district' to 'String'
        state: String,
        phonenumber:Number,
        isDefault: {
            type: Boolean,
            default: true
        }
    }],
    password: {
        type: String,
        required: true,
        trim: true,
    },
    referralCode:{
        type:String,
        unique:true
    },
    referrer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isReferralLinkUsed:{
        type:Boolean,
        default:false
    },
    hasReceivedSignupReward:{
        type:Boolean,
        default:false
    },
    hasReceivedReferralReward:{
        type:Boolean,
        default:false
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
