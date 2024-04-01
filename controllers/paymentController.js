const RazorPay = require("razorpay");
const orderSchema = require("../models/orderSchema");
const crypto = require("crypto");
const { Console } = require("console");
const instance = new RazorPay({
  key_id: "rzp_test_wSI5EPnj247nka",
  key_secret: "SLuFj6gtBXUqG790OgKrnRx7",
});
const cartSchema = require("../models/cartSchema");
const paymentController = {};
paymentController.generatePaymentOrder = async (orderId, total) => {
  const amount = Math.round(total * 100);
  try {
    var options = {
      amount: amount,
      currency: "INR",
      receipt: orderId,
    };
    console.log("OPTIONS", options);
    const order = await new Promise((resolve, reject) => {
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log("Error occurred", err);
          reject(err);
        } else {
          console.log("new order from razorpay", order);
          resolve(order);
          console.log("ORDER", order);
        }
      });
    });
    return order;
  } catch (error) {
    console.error("Error in generatePaymentOrder:", error);
    throw error;
  }
};

paymentController.verifyOnlinePayment = async (details) => {
  console.log("DETAILS", details);
  return new Promise((resolve, reject) => {
    try {
      let hmac = crypto.createHmac("sha256", "SLuFj6gtBXUqG790OgKrnRx7");
      console.log("hmac", hmac);

      // sha256 secure for hashing
      hmac.update(
        details.payment.razorpay_order_id +
          "|" +
          details.payment.razorpay_payment_id
      );
      hmac = hmac.digest("hex");

      if (hmac == details.payment.razorpay_signature) {
        resolve(); // Signature matched, payment verified
      } else {
        reject(new Error("Razorpay signature mismatch")); // Signature mismatch, payment not verified
      }
    } catch (error) {
      console.error("Error in verifyOnlinePayment:", error);
      reject(error); // Reject with error if any exception occurs
    }
  });
};

paymentController.updatePaymentStatus = async (orderId, paymentStatus) => {
  console.log("in updatepaymentstatsus", orderId);
  console.log("in updatepaymentstatsus", paymentStatus);
  return new Promise(async (resolve, reject) => {
    try {
      if (paymentStatus === true) {
        await orderSchema.findByIdAndUpdate(orderId, {
          $set: { orderStatus: "Pending" },
        });
        const order = await orderSchema.findById(orderId);
        if (order) {
          for (const product of order.products) {
            product.orderStatus = "Pending";
          }
          await order.save();
          const userId = order.userId;
          await cartSchema.findOneAndDelete({ userId: userId });
        }
        resolve();
      } else {
        await orderSchema.findByIdAndUpdate(orderId, {
          $set: { orderStatus: "Failed" },
        });
        resolve();
      }
    } catch (error) {
      console.error("Error occurred during updating payment status:", error);
      reject(error);
    }
  });
};

module.exports = paymentController;
