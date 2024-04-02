const cartSchema = require("../models/cartSchema");
const productSchema = require("../models/product");
const orderSchema = require("../models/orderSchema");
const User = require("../models/User");
const couponSchema = require("../models/couponSchema");
const walletSchema = require("../models/walletSchema");
const userOrderController = {};
require("dotenv").config();
const Razorpay = require("razorpay");
const instance = new Razorpay({
  key_id: "rzp_test_wSI5EPnj247nka",
  key_secret: "SLuFj6gtBXUqG790OgKrnRx7",
});
const crypto = require("crypto");
const pdf = require("pdfkit");
const paymentController = require("../controllers/paymentController");
const { order } = require("paypal-rest-sdk");
const easyinvoice = require("easyinvoice");
const fs = require("fs");
const path = require("path");

userOrderController.placeOrder = async (req, res) => {
  try {
    console.log("in placement");

    const { paymentMethod, addressId } = req.body;
    console.log("Payment Method:", paymentMethod);

    const deliveryCharges = parseFloat(
      req.body.deliveryCharges.replace(/[^\d.-]/g, "")
    );
    console.log("DELIVERYCHARGES", deliveryCharges);

    const couponDiscount = parseFloat(req.query.couponDiscount || 0);
    console.log("COUPONDISCOUNT", couponDiscount);

    if (!addressId) {
      return res.json({ status: "error", message: "Address not found" });
    }

    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ status: "error", message: "User not found" });
    }

    let cart = await cartSchema
      .findOne({ userId: userId })
      .populate("products.productId");

    if (!cart) {
      return res.json({ status: "error", message: "Cart not found" });
    }

    const shippingAddress = user.address.find(
      (address) => address._id.toString() === addressId.toString()
    );

    if (!shippingAddress) {
      return res.json({
        status: "error",
        message: "Shipping address not found",
      });
    }

    const products = cart.products;

    const orderProducts = [];
    let totalAmount = 0;

    for (const product of products) {
      if (typeof product.total === "number" && !isNaN(product.total)) {
        const productTotal = product.quantity * product.productId.price;
        orderProducts.push({
          productId: product.productId._id,
          productName: product.productId.name,
          quantity: product.quantity,
          total: productTotal,
        });
        totalAmount += productTotal;
      } else {
        console.error("Invalid product total:", product.total);
      }
    }

    console.log("Total Amount:", totalAmount);

    const grandTotalBeforeCoupon = totalAmount;
    let grandTotal = isNaN(couponDiscount)
      ? totalAmount
      : Math.ceil(totalAmount - (totalAmount * couponDiscount) / 100);
    const couponDifference = grandTotalBeforeCoupon - grandTotal;
    console.log("Coupon Difference:", couponDifference);
    console.log("Grand Total Before Coupon:", grandTotalBeforeCoupon);

    const grandTotalWithDelivery = grandTotal + deliveryCharges;
    console.log("Grand Total With Delivery:", grandTotalWithDelivery);

    const addressToShip = {
      username: user.username,
      phonenumber: shippingAddress.phonenumber,
      houseaddress: shippingAddress.houseaddress,
      state: shippingAddress.state,
      district: shippingAddress.district,
      city: shippingAddress.city,
      pincode: shippingAddress.pincode,
    };

    const newOrderData = new orderSchema({
      userId: userId,
      totalAmount: grandTotalWithDelivery,
      paymentMethod: paymentMethod,
      addresstoDeliver: addressToShip,
      products: orderProducts,
      deliveryCharges: deliveryCharges,
    });

    if (!isNaN(couponDiscount)) {
      newOrderData.couponDiscount = couponDiscount;
      newOrderData.couponDiscountDifference = couponDifference;
    }

    if (paymentMethod === "Cash On Delivery" && grandTotal > 1000) {
      return res.json({
        status: "error",
        message: "COD not available. Try RazorPay",
      });
    } else if (paymentMethod === "Cash On Delivery") {
      const userId = req.session.userId;
      await cartSchema.findByIdAndDelete(userId);
      let orderPlaced = await newOrderData.save();
      orderPlaced.orderStatus = "Pending";
      for (const product of orderPlaced.products) {
        product.orderStatus = "Pending";
      }
      await orderPlaced.save();
      await cartSchema.findOneAndDelete({ userId: userId });
      return res.json({
        status: "Cash on Delivery",
        placedOrderId: orderPlaced._id,
      });
    }

    if (paymentMethod === "Wallet") {
      const userId = req.session.userId;
      console.log("USERID", userId);
      let userWallet = await walletSchema.findOne({ userId: userId });
      if (!userWallet) {
        userWallet = new walletSchema({ userId: userId });
      }
      if (userWallet.amount >= grandTotalWithDelivery) {
        userWallet.amount -= grandTotalWithDelivery;

        let orderPlaced = await newOrderData.save();
        userWallet.transactionHistory.push({
          type: "debit(Purchased Product)",
          amount: orderPlaced.totalAmount,
          orderId: orderPlaced._id,
          date: new Date(),
        });
        await userWallet.save();

        orderPlaced.orderStatus = "Pending";
        for (const product of orderPlaced.products) {
          product.orderStatus = "Pending";
        }
        await orderPlaced.save();
        await cartSchema.findOneAndDelete({ userId: userId });
        return res.json({
          status: "Wallet",
          message: "Order placed successfully",
        });
      } else {
        return res.json({
          status: "error",
          message: "Insufficient amount in wallet",
        });
      }
    }

    if (paymentMethod === "RazorPay") {
      let orderPlaced = await newOrderData.save();
      orderPlaced.orderStatus = "Failed";
      for (const product of orderPlaced.products) {
        product.orderStatus = "Failed";
      }
      await orderPlaced.save();
      const orderId = orderPlaced._id;
      const total = grandTotalWithDelivery;

      paymentController
        .generatePaymentOrder(orderId, total)
        .then((response) => {
          res.json({ status: "RazorPay", response });
        });
    }

    if (user && user.referrer && !user.hasReceivedSignupReward) {
      const referrer = await User.findById(user.referrer);
      if (referrer) {
        const referralRewardAmount = 100;
        let referrerWallet = await walletSchema.findOne({
          userId: referrer._id,
        });
        if (!referrerWallet) {
          referrerWallet = new walletSchema({ userId: referrer._id });
        }
        referrerWallet.amount += referralRewardAmount;

        referrerWallet.transactionHistory.push({
          type: "Earned by referring",
          amount: referralRewardAmount,
          date: new Date(),
        });

        await referrerWallet.save();
        user.hasReceivedReferralReward = true;
        await user.save();
      }

      const signupRewardAmount = 50;
      let newUserWallet = await walletSchema.findOne({ userId: userId });
      if (!newUserWallet) {
        newUserWallet = new walletSchema({ userId: userId });
      }
      newUserWallet.amount += signupRewardAmount;
      newUserWallet.transactionHistory.push({
        type: "Credit-Earned by signup",
        amount: signupRewardAmount,
        date: new Date(),
      });
      await newUserWallet.save();
      user.hasReceivedSignupReward = true;
      await user.save();
    }
  } catch (error) {
    console.log("An error occurred while placing the order:", error);
    res.render("error");
    // res.json({ status: 'error', message: 'Order failed' + error });
  }
};

userOrderController.verifyPayment = async (req, res) => {
  try {
    const userId = req.session.userId;
    const data = req.body;
    console.log("111111111111111111", data);
    const receipt = data.order.receipt;
    console.log("RECEIPT", receipt);

    // Assuming you need the cart, you can fetch it from the database
    const cart = await cartSchema.findOne({ userId: userId });
    paymentController.verifyOnlinePayment(data).then(() => {
      let paymentSuccess = true;
      paymentController
        .updatePaymentStatus(receipt, paymentSuccess)
        .then(() => {
          res.json({ status: "paymentSuccess", placedOrderId: receipt });
        });
    });
  } catch (error) {
    console.log("Rejected verifyonlinepayment", error);
    let paymentSuccess = false;
    paymentController.updatePaymentStatus(receipt, paymentSuccess).then(() => {
      res.json({ status: "paymentFailed", placedOrderId: receipt });
    });
  }
};

//showing orders
userOrderController.showOrders = async (req, res) => {
  try {
    const ordersPerPage = 50;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const totalOrders = await orderSchema.countDocuments();
    const totalPages = Math.ceil(totalOrders / ordersPerPage);
    const userId = req.session.userId;

    const user = await User.findById(userId);
    const userOrders = await orderSchema
      .find({ userId: userId })
      .sort({ date: -1, _id: -1 })
      .skip(offset)
      .limit(limit);
      res.render("userOrders", { userOrders, user, totalPages, currentPage: page });

  } catch (error) {
    console.log("Error occured while showing userorders", error);
    res.render("error");
  }
};
//showing userorders
userOrderController.orderDetails = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    const orderDetails = await orderSchema
      .findById(userId)
      .populate("products.productId");

    res.render("orderDetails", { orderDetails, user });
  } catch (error) {
    console.log("Error occured while showing order details", error);
    res.render("error");
  }
};
//cancelling orders
userOrderController.cancelOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const orderId = req.params.orderId;
    console.log("in orderid", orderId);
    const productId = req.params.productId;
    console.log("PRODUCTID", productId);
    const existingProduct = await productSchema.findById(productId);
    const order = await orderSchema.findOne({ _id: orderId });
    const orderDetails = await orderSchema
      .findById(orderId)
      .populate("products.productId");

    if (!orderDetails) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });
    }
    const productIndex = orderDetails.products.findIndex(
      (product) => product.productId._id.toString() === productId
    );
    console.log("PRODUCTINDEX", productIndex);
    if (productIndex === -1) {
      return res.json({ status: "error", message: "product not found" });
    }
    const productToCancel = orderDetails.products[productIndex];
    console.log("PRODUCTTOCANCEL", productToCancel);
    const quantityOrdered = productToCancel.quantity;
    const refundedAmount = productToCancel.total;
    if (orderDetails.paymentMethod !== "Cash on Delivery") {
      let wallet = await walletSchema.findOne({ userId: userId });
      if (!wallet) {
        wallet = new walletSchema({
          userId: userId,
          amount: 0,
          transactionHistory: [],
        });
      }
      wallet.amount += refundedAmount;
      wallet.transactionHistory.push({
        type: "credit(Cancelling product order)",
        amount: refundedAmount,
        orderId: orderId,
        product: {
          productId: productId,
          productName: productToCancel.productId.name,
          quantity: quantityOrdered,
        },
        date: new Date(),
      });
      await wallet.save();

      existingProduct.stock += quantityOrdered;
      await existingProduct.save();
    }
    orderDetails.products[productIndex].orderStatus = "Cancelled";
    await orderDetails.save();
    const allProductsCancelled = orderDetails.products.every(
      (product) => product.orderStatus === "Cancelled"
    );
    if (allProductsCancelled) {
      orderDetails.orderStatus = "Cancelled";
      await orderDetails.save();
    }
    // // order.totalAmount-=refundedAmount
    // // await order.save()
    // if(orderDetails.products.length===0)
    // {
    //     orderDetails.orderStatus="Cancelled"
    // }
    // await orderDetails.save()
    res.json({
      status: "success",
      message: "order for this product has been cancelled",
    });
  } catch (error) {
    console.log("Error occurred during cancelling order", error);
    res.render("error");
    // res.status(500).json({ status: 'error', message: "Internal Server Error" });
  }
};

userOrderController.returnOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    console.log("REQ.BODY", req.body);
    const userId = req.session.userId;
    const orderId = req.params.orderid;
    const productId = req.params.productId;
    console.log("PRODUCTID", productId);
    console.log("ORDERID", orderId);

    // Find the order by ID
    const order = await orderSchema
      .findById(orderId)
      .populate("products.productId");
    const productIndex = order.products.findIndex(
      (product) => product.productId._id.toString() === productId
    );
    const productToReturn = order.products[productIndex];

    // Calculate the difference in days between the current date and the delivered date
    const deliveredDate = new Date(order.date);
    const currentDate = new Date();
    const difference = currentDate - deliveredDate;
    const differenceInDay = difference / (1000 * 60 * 60 * 24);

    // Check if the return date has ended
    if (differenceInDay > 3) {
      return res.json({ status: "error", message: "Return date ended" });
    } else {
      productToReturn.orderStatus = "Return Requested";
      productToReturn.message = reason;

      // Check if any product's status is not "Return Requested" to determine the overall order status
      const allProductsReturned = order.products.every(
        (product) => product.orderStatus === "Return Requested"
      );
      if (allProductsReturned) {
        order.orderStatus = "Return Requested";
      }
    }
    await order.save();

    // Send success response
    return res.json({
      status: "success",
      message: "Return requested successfully",
    });
  } catch (error) {
    console.log("Error occurred during return order", error);
    res.render("error");
    // res.json({ status: "error", message: "Internal server error" });
  }
};

userOrderController.retryPayment = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    const orderId = req.params.id;
    console.log("orderID", orderId);
    const order = await orderSchema
      .findById(orderId)
      .populate("products.productId");
    const coupons = await couponSchema.find();
    let total = 0;
    order.products.forEach((product) => {
      total += parseFloat(product.total) * product.quantity;
    });
    let deliveryCharges = calculateDeliveryCharges(total);
    let couponDiscountPercentage = 0;
    if (order.couponDiscount) {
      couponDiscountPercentage = parseFloat(order.couponDiscount);
      const couponDiscountAmount = (couponDiscountPercentage / 100) * total;
      total -= couponDiscountAmount;
    }
    const grandTotalWithDelivery = total + deliveryCharges;
    res.render("repayment", {
      user,
      products: order.products,
      grandTotal: grandTotalWithDelivery,
      deliveryCharges,
      couponDiscountPercentage,
      order,
    });
  } catch (error) {
    console.log("Error occured during retryPayment", error);
    res.render("error");
  }
};
function calculateDeliveryCharges(total) {
  let deliveryCharges = 0;
  if (total > 1000) {
    deliveryCharges = 20;
  } else if (total > 1400 || total > 1700) {
    deliveryCharges = 50;
  } else if (total > 1700 || total > 2000) {
    deliveryCharges = 100;
  }
  return deliveryCharges;
}

userOrderController.failedOrderPlacing = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.userId;
    console.log("IN RETYRPAYMENT");
    const paymentMethod=req.body.paymentMethod
    const order = await orderSchema.findById(orderId);
    order.orderStatus = "Pending";
    for (const product of order.products) {
      product.orderStatus = "Pending";
    }
    order.paymentMethod = req.body.paymentMethod;
    await order.save();
    const cart = await cartSchema.findOneAndDelete({ userId: userId });
  } catch (error) {
    console.log("Error occured during failedOrderPlacing", error);
    res.render("error");
  }
};
// userOrderController.refailed=async(req,res)=>{
//     try {
//         const orderId=req.params.id
//         console.log('IN RETYRPAYMENT')
//         const order=await orderSchema.findById(orderId)
//         order.orderStatus="Failed"
//         await order.save()
//     } catch (error) {
//         console.log("Error occured during failedOrderPlacing",error)
//     }
// }

userOrderController.invoice = async (req, res) => {
  console.log("in invoice");
  try {
    const orderDetails = req.body;
    // Adjust position and size as needed

    console.log("Req.body", orderDetails);
    const userId = req.session.userId;
    const user = await User.findById(userId);

    const pdfDoc = new pdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
    pdfDoc.pipe(res);

    // Set font
    pdfDoc.font("Helvetica");
    const logoPath = "public/LogoMakerCa-1711860095659-removebg-preview.png";

    pdfDoc.image(logoPath, 60, 50, { width: 100 });
    // Add invoice title
    pdfDoc
      .fontSize(14)
      .text(`Invoice`, { align: "center", underline: true })
      .moveDown();

    // Company address
    pdfDoc.fontSize(10).text(`G-HUB`, { align: "right" });
    pdfDoc.fontSize(10).text(`Kolkata,`, { align: "right" });
    pdfDoc.fontSize(10).text(`DehraDun`, { align: "right" });
    pdfDoc.fontSize(10).text(` Rajasthan`, { align: "right" });
    pdfDoc.fontSize(10).text(`655595`, { align: "right" });
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.fontSize(10).text(`Customer Name: ${user.username}`);
    pdfDoc
      .fontSize(10)
      .text(`Phone Number: ${orderDetails.address.phonenumber}`);
    pdfDoc.fontSize(10).text(`Address: ${orderDetails.address.houseaddress},`);
    pdfDoc
      .fontSize(10)
      .text(
        `${orderDetails.address.city}, ${orderDetails.address.state}, ${orderDetails.address.pincode}`
      );
    pdfDoc.moveDown();
    pdfDoc.moveTo(50, pdfDoc.y).lineTo(550, pdfDoc.y).stroke();
    pdfDoc.moveDown();

    // Customer address

    // Order details
    pdfDoc.fontSize(10).text("Order Details", { underline: true }).moveDown();
    pdfDoc.fontSize(10).text(`Order ID: ${orderDetails.orderId}`);
    const deliveredDate = new Date(orderDetails.deliveredDate);
    const formattedDeliveredDate = deliveredDate.toLocaleDateString("en-GB");
    pdfDoc.fontSize(10).text(`Delivered Date: ${formattedDeliveredDate}`)
    


    // Product details
    // Product details
    // Product details
    let totalAmount = 0;
    let yPosition = 300; // Initial y-position for the table
    const columnWidths = [250, 200, 200]; // Widths for each column
    const columnTitles = ["Product Name", "Quantity", "Total"]; // Titles for each column
    const marginLeft = 100;
    pdfDoc.fontSize(10);
    columnTitles.forEach((title, index) => {
      pdfDoc.text(title, 100 + index * columnWidths[index], yPosition);
    });
    yPosition += 20; // Move to the next row

    for (let i = 0; i < orderDetails.products.length; i++) {
      if (orderDetails.products[i]) {
        const product = orderDetails.products[i];
        const productTotal = parseFloat(product.total);
        totalAmount += productTotal;
        columnTitles.forEach((title, index) => {
          const value =
            index === 0
              ? product.productname
              : index === 1
              ? product.quantity.toString()
              : `Rs.${productTotal}`;
          pdfDoc.text(
            value,
            marginLeft + index * columnWidths[index],
            yPosition
          );
        });
        yPosition += 20; // Move to the next row
      }
    }

    // Add delivery charge for the entire order
    const deliveryCharge = parseFloat(orderDetails.deliveryCharges);
    totalAmount += deliveryCharge;

    // Draw delivery charges row
    pdfDoc.text("Delivery Charges", marginLeft, yPosition);
    pdfDoc.text("", marginLeft + 200, yPosition); // Empty column for quantity
    pdfDoc.text(`Rs.${deliveryCharge}`, marginLeft + 400, yPosition);
    yPosition += 20; // Move to the next row

    // Draw total amount row
    pdfDoc.text("Total Amount", marginLeft, yPosition);
    pdfDoc.text("", marginLeft + 200, yPosition); // Empty column for quantity
    pdfDoc.text(`Rs.${totalAmount}`, marginLeft + 400, yPosition);
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.text("Thank you for your order!", marginLeft + 150, 500);

    pdfDoc.end();
  } catch (error) {
    res.render("error");

    // console.log("Error occurred while downloading invoice", error);
    // res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

module.exports = userOrderController;
