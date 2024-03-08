        const mongoose = require('mongoose');
        const productSchema=require('../models/product')
        const user=require('../models/User')

        const orderSchema = new mongoose.Schema({
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            date: {
                type: Date,
                default: new Date(),
                required: true
            },
            totalAmount: {
                type: Number,
                required: true
            },
            paymentMethod: {
                type: String
            },
            products: [{
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1
                },
                total: {
                    type: Number
                }
            }],
            addresstoDeliver:{
                username:String,
                phonenumber:Number,
                houseaddress:String,
                state:String,
                district:String,
                city:String,
                pincode:Number,

            },
            orderStatus:{
                type:String,
                default: "Pending"
            },
            deliveredDate:{
                type:Date,
                default:''
            },
            couponDiscount:{
                type:Number,
                default:0,
            },
        });


        module.exports = mongoose.model('Order', orderSchema);
