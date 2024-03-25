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
            deliveryCharges:{
                type:Number,
                default:0
            },
            products: [{
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                orderStatus:{
                    type:String,
                    default:'pending'

                },
                message:{
                    type:String
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
            },
            deliveredDate:{
                type:Date,
                default:''
            },
            couponDiscount:{
                type:Number,
                default:0,
            },
            couponDiscountDifference:{
                type:Number,
                default:0
            }
        });


        module.exports = mongoose.model('Order', orderSchema);
