const { ref } = require("pdfkit");
const User = require("../models/User");
const orderSchema = require("../models/orderSchema");
const productSchema = require("../models/product");
const walletSchema = require("../models/walletSchema");
const { refund } = require("paypal-rest-sdk");
const adminOrderController = {};
//showing orders
adminOrderController.showOrders = async (req, res) => {
  try {
    const productsPerPage = 5;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const totalOrders = await orderSchema.countDocuments();
    const totalPages = Math.ceil(totalOrders / productsPerPage);
    let matchQuery = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      matchQuery = { _id: { $regex: searchRegex } };
    }

    if (req.query.orderStatus) {
      matchQuery.orderStatus = req.query.orderStatus;
    }

    const orders = await orderSchema
      .aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productsData",
          },
        },
        { $sort: { date: -1, _id: -1 } },
        { $skip: offset },
        { $limit: productsPerPage },
      ])
      .exec();

    res.render("adminOrders", {
      orders,
      productsPerPage,
      currentPage: page,
      totalPages,
      searchQuery: req.query.search,
      orderStatus: req.query.orderStatus,
    });
  } catch (error) {
    console.log("An error occurred while loading admin orders", error);
    res.render("error");
  }
};

//showing the orderdetails
adminOrderController.orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.userId;

    // Find the user by userId
    const user = await User.findById(userId);

    // Find the order details by orderId and populate the 'products' field
    const orderDetails = await orderSchema
      .findById(orderId)
      .populate("products.productId");

    if (!orderDetails) {
      return res.json({ status: "error", message: "Order not found" });
    }

    // Render the adminOrderDetails view with orderDetails and user data
    res.render("adminOrderDetails", { orderDetails, user });
  } catch (error) {
    console.log("Error occurred during showing admin order details", error);
    res.render("error");
  }
};

//changint the orderstatus of products
adminOrderController.changeOrderStatus = async (req, res) => {
  try {
    console.log("IN ORDERstatus");
    const { status, orderId } = req.body;
    console.log("Request Body:", req.body);

    const orderData = await orderSchema
      .findById(orderId)
      .populate("products.productId");
    console.log("ORDERDATA", orderData);

    const existingStatus = orderData.orderStatus;
    console.log("Existing status", existingStatus);

    if (existingStatus === "Cancelled") {
      return res.json({
        status: "error",
        message: "Already cancelled so no more operations",
      });
    } else {
      for (const productInfo of orderData.products) {
        const productId = productInfo.productId._id;
        const quantity = productInfo.quantity;

        // Update the stock for each product
        await productSchema.findByIdAndUpdate(productId, {
          $inc: { stock: quantity },
        });
        productInfo.orderStatus = status;
        await productInfo.save();
      }

      orderData.orderStatus = status;
      console.log("Updated Order Status:", orderData.orderStatus);
      if (status === "Delivered") {
        orderData.deliveredDate = new Date();
        for (const productInfo of orderData.products) {
          (productInfo.orderStatus = "Delivered"), await productInfo.save();
        }
      }
      await orderData.save();
      console.log("Status changed");
      return res.json({
        status: "success",
        message: "Order status updated successfully",
      });
    }
  } catch (error) {
    console.log("Error updating order status:", error);
    res.render("error");
    // return res.json({ status: "error", message: "An error occurred while updating order status" });
  }
};
adminOrderController.allowReturn = async (req, res) => {
  try {
    console.log("IN allowreturn");

    const orderId = req.params.orderId;
    const productId = req.params.productId;
    const existingProduct = await productSchema.findById(productId);
    const order = await orderSchema.findOne({ _id: orderId });
    console.log("ORDER", order);
    const userId = order.userId;
    console.log("USERID", userId);
    const orderDetails = await orderSchema
      .findById(orderId)
      .populate("products.productId");
    const productIndex = orderDetails.products.findIndex(
      (product) => product.productId._id.toString() === productId
    );
    const productToReturn = orderDetails.products[productIndex];
    const quantityOrdered = productToReturn.quantity;
    const refundedAmount = productToReturn.total;
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
        type: "credit(Returning an order)",
        amount: refundedAmount,
        orderId: orderId,
        date: new Date(),
      });
      await wallet.save();
      existingProduct.stock += quantityOrdered;
      await existingProduct.save();
      orderDetails.products[productIndex].orderStatus = "Return Accepted";
      await orderDetails.save();
      const allProductsReturned = orderDetails.products.every(
        (product) => product.orderStatus === "Return Accepted"
      );
      if (allProductsReturned) {
        orderDetails.orderStatus = "Returned";
        await orderDetails.save();
      }
      res.json({ status: "success", message: "allowed successfully" });
      console.log("returnedsuccessfully");
    }
  } catch (error) {
    console.log("error occured", error);
  }
};

adminOrderController.declineReturn = async (req, res) => {
  console.log("IN DECLINERETURN");
  try {
    const orderId = req.params.orderId;
    const productId = req.params.productId;
    const order = await orderSchema.findById(orderId);
    const productIndex = order.products.findIndex(
      (product) => product.productId._id.toString() === productId
    );
    (order.products[productIndex].orderStatus = "Request Declined"),
      await order.save();
    const allProductsReturned = order.products.every(
      (product) => product.orderStatus === "Request Declined"
    );
    if (allProductsReturned) {
      order.orderStatus = "Request Declined";
      await order.save();
    }
    return res.json({ status: "success" });
  } catch (error) {
    console.log("Error occured", error);
  }
};

module.exports = adminOrderController;
