const cartSchema=require('../models/cartSchema')
const productSchema=require('../models/product')
const orderSchema=require('../models/orderSchema')
const User = require('../models/User')
const walletSchema=require('../models/walletSchema')
const wallet = require('../models/walletSchema')
const userOrderController={}
const razorpay=require('razorpay')
const razorpayInstance=new razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
  })
  const crypto=require('crypto')

//place order
userOrderController.placeOrder = async (req, res) => {
    try {
        const { paymentMethod, addressId } = req.body;
        const couponDiscount = parseFloat(req.query.couponDiscount || 0);

        if (!addressId) {
            return res.json({ status: 'error', message: 'Address not found' });
        }

        const userId = req.session.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ status: 'error', message: 'User not found' });
        }

        let cart = await cartSchema.findOne({ userId: userId }).populate('products.productId');

        if (!cart) {
            return res.json({ status: 'error', message: 'Cart not found' });
        }

        const shippingAddress = user.address.find((address) => address._id.toString() === addressId.toString());

        if (!shippingAddress) {
            return res.json({ status: 'error', message: 'Shipping address not found' });
        }

        const products = cart.products;

        const orderProducts = [];
        const totalAmount = cart.products.reduce((total, product) => {
            if (typeof product.total === 'number' && !isNaN(product.total)) {
                orderProducts.push({
                    productId: product.productId._id,
                    productName: product.productId.name,
                    quantity: product.quantity,
                    total: product.total,
                });
                return total + product.total;
            } else {
                console.error('Invalid product total:', product.total);
                return total;
            }
        }, 0);

        let grandTotal;
        if (!isNaN(couponDiscount)) {
            grandTotal = Math.ceil(totalAmount - (totalAmount * couponDiscount / 100));
        } else {
            grandTotal = totalAmount;
        }

        const addressToShip = {
            username: user.username,
            phonenumber: shippingAddress.phonenumber,
            houseaddress: shippingAddress.houseaddress,
            state: shippingAddress.state,
            district: shippingAddress.district,
            city: shippingAddress.city,
            pincode: shippingAddress.pincode,
        };

        const newOrderData = {
            userId: userId,
            totalAmount: grandTotal,
            paymentMethod: paymentMethod,
            addresstoDeliver: addressToShip,
            products: orderProducts,
        };

        if (!isNaN(couponDiscount)) {
            newOrderData.couponDiscount = couponDiscount;
        }

        const newOrder = new orderSchema(newOrderData);

        if (paymentMethod === 'razorpay') {
            let orderPlaced = await newOrder.save();
            const orderId = orderPlaced._id;

            // Generate Razorpay order
            const razorpayOrder = await generatePaymentOrder(orderId, grandTotal);

            res.json({ status: 'success', message: 'Order placed', razorpayOrder });
        } else {
            let orderPlaced = await newOrder.save();
            await cartSchema.findOneAndUpdate({ userId: userId }, { $set: { products: [] } });

            res.json({ status: 'success', message: 'Order placed' });
        }
    } catch (error) {
        console.log('An error occurred while placing the order  ', error);
        res.json({ status: 'error', message: 'Order failed' });
    }
};

async function generatePaymentOrder(orderId, grandTotal) {
    return new Promise((resolve, reject) => {
        const options = {
            amount: grandTotal * 100,
            currency: 'INR',
            receipt: orderId.toString(),
        };

        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                console.log('Error occurred during Razorpay', err);
                reject(err);
            } else {
                console.log('New order from Razorpay', order);
                resolve(order);
            }
        });
    });
}
userOrderController.verifyPayment = async (req, res) => {
    try {
        console.log("in payment verification")
        const userId = req.session.userId;
        const data = req.body;
        const receipt = data.order.receipt;
        // Assuming you need the cart, you can fetch it from the database
        const cart = await cartSchema.findOne({ userId: userId });

        const verifyOnlinePayment = async (details) => {
            return new Promise((resolve, reject) => {
                let hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
                hmac.update(details.payment.razorpay_order_id + '|' + details.payment.razorpay_payment_id);
                hmac = hmac.digest('hex');
                if (hmac === details.payment.razorpay_signature) {
                    resolve();
                } else {
                    reject();
                }
            });
        }

        // Verify the payment
        await verifyOnlinePayment(data);

        // Update payment status in your database
        const orderId = data.order.id; // Assuming this is the order ID
        const paymentStatus = true; // Change this based on your logic

        await updatePaymentStatus(orderId, paymentStatus);

        res.json({ status: 'success', message: 'Payment verified successfully' });
    } catch (error) {
        console.log('Error occurred while verifying payment:', error);
        res.json({ status: 'error', message: 'Payment verification failed' });
    }
};

const updatePaymentStatus = async (orderId, paymentStatus) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (paymentStatus) {
                await orderSchema.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Pending' } });
                resolve();
            } else {
                await orderSchema.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Failed' } });
                resolve();
            }
        } catch (error) {
            reject(error);
            console.log('Error occurred while updating payment status:', error);
        }
    });
};
//showing orders
userOrderController.showOrders=async(req,res)=>{
    try {
        const ordersPerPage=5
        const page=parseInt(req.query.page)||1
        const limit=5
        const offset=(page-1)*limit
        const totalOrders=await orderSchema.countDocuments()
        const totalPages=Math.ceil(totalOrders/ordersPerPage)
        const userId=req.session.userId

        const user=await User.findById(userId)
        const userOrders=await orderSchema.find({userId:userId}).sort({date:-1}).skip(offset).limit(limit)
        res.render('userorders',{userOrders,user,totalPages,currentPage:page})
    } catch (error) {
        console.log("Error occured while showing userorders",error)
    }
}
//showing userorders
userOrderController.orderDetails=async(req,res)=>{
    try {
        const userId=req.session.userId
        const user=await User.findById(userId)
        const orderDetails=await orderSchema.findById(userId).populate('products.productId')
    
        res.render('orderDetails',{orderDetails,user})
    } catch (error) {
        console.log("Error occured while showing order details",error)
    }
}
//cancelling orders
userOrderController.cancelOrder = async (req, res) => {
    try {
        console.log("In cancel order");
        const userId = req.session.userId;
        console.log("IN CANCEL", userId);
        const orderId = req.params.id;
        console.log("in orderid", orderId);
        const orderDetails = await orderSchema.findById(orderId).populate('products.productId');
        console.log("orderdetails", orderDetails);

        if (!orderDetails) {
            return res.status(404).json({ status: 'error', message: "Order not found" });
        }

        if (orderDetails.orderStatus === 'Cancelled') {
            return res.json({ status: 'error', message: "Order has been cancelled by the admin" });
        } else if (orderDetails.orderStatus === 'Pending') {
            if (orderDetails.paymentMethod !== 'Cash on Delivery') {
                let wallet = await walletSchema.findOne({ userId: userId });

                if (!wallet) {
                    wallet = new walletSchema({ userId: userId, amount: 0, transactionHistory: [] });
                }

                for (const product of orderDetails.products) {
                    const productId = product.productId._id;
                    const quantityOrdered = product.quantity;
                    const existingProduct = await productSchema.findById(productId);
                    const refundedAmount = existingProduct.price * quantityOrdered;
                    wallet.amount += refundedAmount;
                    wallet.transactionHistory.push({
                        type: 'credit(Cancelling Order)',
                        amount: refundedAmount,
                        orderId: orderDetails._id,
                        product: {
                            productId: productId,
                            productName: product.productId.name,
                            quantity: quantityOrdered,
                        },
                        date: new Date(),
                    });                    existingProduct.stock += quantityOrdered;
                    await existingProduct.save();
                }

                // Move wallet.save() outside the loop
                await wallet.save();
            }

            orderDetails.orderStatus = "Cancelled";
            await orderDetails.save();

            res.json({ status: 'success', message: "Order has been cancelled" });
        } else {
            res.json({ status: 'error', message: "Order cannot be cancelled as it is not in Pending state" });
        }
    } catch (error) {
        console.log("Error occurred during cancelling order", error);
        res.status(500).json({ status: 'error', message: "Internal Server Error" });
    }
};


userOrderController.returnOrder = async (req, res) => {
    try {
        console.log("In return");
        
        // Retrieve user ID from the session and order ID from the request parameters
        const userId = req.session.userId;
        const orderId = req.params.id;
        
        console.log('ORDERID', orderId);

        // Find the order by ID
        const order = await orderSchema.findById(orderId);
        
        console.log('ORDER', order);

        // Calculate the difference in days between the current date and the delivered date
        const deliveredDate = new Date(order.date);
        const currentDate = new Date();
        const difference = currentDate - deliveredDate;
        const differenceInDay = difference / (1000 * 60 * 60 * 24);

        // Check if the return date has ended
        if (differenceInDay > 3) {
            return res.json({ status: "error", message: "Return date ended" });
        } else {
            // Find or create a wallet for the user
            let wallet = await walletSchema.findOne({ userId });

            if (!wallet) {
                wallet = new walletSchema({ userId, amount: 0, transactionHistory: [] });
            }

            // Process the return for each product in the order
            for (const product of order.products) {
                const productId = product.productId._id;
                const quantityOrdered = product.quantity;
                const existingProduct = await productSchema.findById(productId);
                const refundedAmount = existingProduct.price * quantityOrdered;

                // Update the wallet amount and transaction history
                wallet.amount += refundedAmount;
                wallet.transactionHistory.push({
                    type: 'credit(Returning  Order)',
                    amount: refundedAmount,
                    orderId: order._id,
                    product: {
                        productId: productId,
                        productName: product.productId.name,
                        quantity: quantityOrdered,
                    },
                    date: new Date(),
                });  

                // Increase the stock of the returned product
                existingProduct.stock += quantityOrdered;

                // Save the changes to the product
                await existingProduct.save();
            }

            // Update the order status to "User Returned" and save changes
            order.orderStatus = "User Returned";
            await order.save();

            // Save the changes to the wallet
            await wallet.save();
        }

        // Send a success response after processing
        res.json({
            status: "success",
            message: "Return requested successfully. Pickup service will contact you.",
        });
    } catch (error) {
        console.log("Error occurred during return order", error);
        res.json({ status: "error", message: "Internal server error" });
    }
};




module.exports=userOrderController