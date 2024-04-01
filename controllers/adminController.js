const adminSchema = require("../models/adminSchema");
const bcrypt = require("bcrypt");
const adminController = {};
const userSchema = require("../models/User");
const orderSchema = require("../models/orderSchema");
const categorySchema = require("../models/category");
const productSchema = require("../models/product");
const pdf = require("pdfkit");
const fs = require("fs");
const exceljs = require("exceljs");
const { order } = require("paypal-rest-sdk");
const customerCareSchema = require("../models/customerCare");
const nodemailer = require("nodemailer");

//adminlogin
adminController.showAdminLogin = async (req, res) => {
  if (!req.session.AdminLogin) {
    res.render("admin", { message: "" });
  } else {
    res.redirect("/adminpanel");
  }
};

//post adminlogin
adminController.handleAdminLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await adminSchema.findOne({ email });

    if (!admin) {
      return res.render("admin", {
        message: "Admin not found",
        messageType: "danger",
      });
    }

    if (!(await bcrypt.compare(password, admin.password))) {
      return res.render("admin", {
        message: "Invalid password",
        messageType: "danger",
      });
    }

    req.session.AdminLogin = true;
    res.redirect("/adminpanel");
  } catch (error) {
    console.error("Error in admin login:", error);
    res.render("error");
  }
};

//adminlogout
adminController.logout = async (req, res) => {
  console.log("Admin logout");
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error occurred during admin logout", err);
      } else {
        console.log("Logout successful");
        res.redirect("/admin"); // You might want to redirect the user after successful logout
      }
    });
  } catch (error) {
    console.log("Error during logout", error);
    res.render("error");
  }
};

//chart
async function chart() {
  try {
    const ordersPie = await orderSchema.find();
    const ordersCount = {
      pending: 0,
      confirmed: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };
    ordersPie.forEach((order) => {
      if (order.orderStatus === "Pending") {
        ordersCount.pending++;
      } else if (order.orderStatus === "Confirmed") {
        ordersCount.confirmed++;
      } else if (order.orderStatus === "Delivered") {
        ordersCount.delivered++;
      } else if (order.orderStatus === "returned") {
        ordersCount.returned++;
      } else {
        ordersCount.cancelled++;
      }
    });
    return ordersCount;
  } catch (error) {
    console.log("Error occured during order count function", error);
    res.render("error");
  }
}
//count of orders based on month
async function graph() {
  try {
    console.log("IN BAR GRAP");
    const orderCountofMonth = await orderSchema.aggregate([
      {
        $project: {
          month: { $month: "$date" },
        },
      },
      {
        $group: {
          _id: "$month",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    console.log("ORDERCOUNTOFMONTH", orderCountofMonth);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "June",
      "July",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    //getting numeric month id
    const orderCountofMonthwithNames = orderCountofMonth.map((entry) => ({
      month: months[entry._id - 1],
      count: entry.count,
    }));
    const labels = orderCountofMonthwithNames.map((val) => val.month);
    console.log("LABELS", labels);
    const count = orderCountofMonthwithNames.map((val) => val.count);
    console.log("COUNT", count);

    return {
      labels: labels,
      count: count,
    };
  } catch (error) {
    console.error("Error in graph function:", error);
    res.render("error");
  }
}
// current month weekly sale
async function barGraph() {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear;
    const ordersCountByWeek = await orderSchema.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-${currentMonth}-01`),
            $lt: new Date(`${currentYear}-${currentMonth + 1}-01`),
          },
        },
      },
      {
        $project: {
          week: { $isoWeek: "$date" },
        },
      },
      {
        $group: {
          _id: "$week",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const mapIsoWeektoWeek = ($isoWeek) => {
      return `Week ${$isoWeek}`;
    };

    const orderCountofweekwithNames = ordersCountByWeek.map((entry) => ({
      week: mapIsoWeektoWeek(entry._id),
      count: entry.count,
    }));

    const labels = orderCountofweekwithNames.map((val) => val.week);
    const count = orderCountofweekwithNames.map((val) => val.count);

    return {
      labels: labels,
      count: count,
    };
  } catch (error) {
    console.log("Error occured during week orders in bargraph", error);
    res.render("error");
  }
}
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
adminController.sales = async (req, res) => {
  console.log("IN sales");
  console.log("REQ", req.query);
  try {
    const { timeframe } = req.query;
    console.log("TIMEFRAME", timeframe);
    let startDate, endDate;

    if (timeframe === "daily") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      endDate = new Date();
    } else if (timeframe === "weekly") {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date();
    } else if (timeframe === "monthly") {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear(), 0, 1);
      endDate = new Date();
    } else if (timeframe === "yearly") {
      const today = new Date();
      startDate = new Date(today.getFullYear(), 0, 1); // January 1st of the current year
      endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st of the current year
    } else {
      return res.json({ status: "error", message: "Invalid time frame" });
    }

    const orders = await orderSchema.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const salesData = {};
    if (timeframe === "daily") {
      for (let i = 0; i < 6; i++) {
        const date = formatDate(
          new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        );
        salesData[date] = 0;
      }
    } else if (timeframe === "weekly") {
      for (let i = 0; i < 6; i++) {
        const date = formatDate(
          new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000)
        );
        salesData[date] = 0;
      }
    } else if (timeframe === "monthly") {
      for (let i = 0; i < 12; i++) {
        const monthStartDate = new Date(startDate.getFullYear(), i, 1);
        const monthEndDate = new Date(startDate.getFullYear(), i + 1, 0);
        const monthSales = orders.filter(
          (order) => order.date >= monthStartDate && order.date <= monthEndDate
        );
        const monthTotalSales = monthSales.reduce(
          (total, order) => total + order.totalAmount,
          0
        );
        salesData[monthStartDate.toISOString()] = monthTotalSales;
      }
    }

    orders.forEach((order) => {
      const date = formatDate(order.date);
      salesData[date] += order.totalAmount;
    });

    const labels = Object.keys(salesData).map((date) =>
      formatDate(new Date(date))
    );
    const values = Object.values(salesData);
    res.json({ labels, values });
  } catch (error) {
    console.log("Error occurred in sales", error);
    // res.status(500).json({ status: "error", message: "Internal server error" });
    res.render("error");
  }
};

adminController.topSellingProducts = async (req, res) => {
  try {
    const bestSellingProducts = await orderSchema.aggregate([
      { $match: { orderStatus: "Delivered" } }, // Filter orders with orderStatus "Delivered"
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$product._id",
          productTitle: "$product.name",
          totalQuantity: 1,
        },
      },
    ]);

    console.log("BESTSELLING", bestSellingProducts);
    res.render("bestSellingProduct", { bestSellingProducts });
  } catch (error) {
    console.log("Error occured during topselling products", error);
    res.render("error");
  }
};

adminController.topSellingCategory = async (req, res) => {
  try {
    const orderCount = await orderSchema.countDocuments();
    console.log("ORDERCOUNT", orderCount);

    const bestSellingCategory = await orderSchema.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 6 },
      { $project: { _id: 1, categoryName: 1, totalQuantity: 1 } },
    ]);

    res.render("bestSellingCategory", { bestSellingCategory });
    console.log("bestsellingcategory", bestSellingCategory);
  } catch (error) {
    console.log("Error occurred during topsellingCategory", error);
    res.render("error");
  }
};

adminController.topSellingBrands = async (req, res) => {
  try {
    const bestSellingBrands = await orderSchema.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $group: {
          _id: "$brand._id",
          brandName: { $first: "$brand.name" },
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 6 },
      { $project: { _id: 1, brandName: 1, totalQuantity: 1 } },
    ]);
    res.render("bestSellingBrands", { bestSellingBrands });
    console.log("BESTSELLINGBRANDS", bestSellingBrands);
  } catch (error) {
    console.log("Error occured", error);
    res.render("error");
  }
};

adminController.showAdminPanel = async (req, res) => {
  try {
    if (req.session.AdminLogin) {
      const orders = await orderSchema.aggregate([
        {
          $match: {
            orderStatus: { $in: ["Delivered", "Cancelled"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      const [
        ordersData,
        totalOrders,
        totalProducts,
        totalCategory,
        totalUsers,
        ordersPie,
        ordersGraph,
        bestsellingCategory,
        bestsellingProducts,
        bestSellingCategory,
        ordersBarGraph,
      ] = await Promise.all([
        orderSchema
          .find({ orderStatus: { $in: ["Delivered", "Cancelled"] } })
          .populate("products.productId"),
        orderSchema.countDocuments({
          orderStatus: { $in: ["Delivered", "Cancelled"] },
        }),
        productSchema.countDocuments(),
        categorySchema.countDocuments(),
        userSchema.countDocuments(),
        chart(),
        graph(),
        barGraph(),
      ]);

      const totalRevenue = orders.length > 0 ? orders[0].totalRevenue : 0;

      res.render("adminPanel", {
        totalRevenue,
        totalOrders,
        totalCategory,
        totalProducts,
        totalUsers,
        ordersPie,
        ordersData,
      });
    } else {
      res.redirect("/admin"); // Redirect to login page if not logged in
    }
  } catch (error) {
    console.error("Error in showing admin panel:", error);
    res.render("error");
  }
};

//filter sale report
adminController.filterSales = async (req, res) => {
  try {
    const value = req.query.by;
    const today = Date.now();
    let discount = 0;

    if (value === "all") {
      const orders = await orderSchema.aggregate([
        {
          $match: { orderStatus: { $in: ["Delivered"] } },
        },
        {
          $sort: { deliveredDate: -1 },
        },
        {
          $unwind: "$products", // Unwind the products array
        },
        {
          $lookup: {
            from: "products", // The name of the product collection
            localField: "products.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        {
          $unwind: "$productInfo", // Unwind the productInfo array
        },
        {
          $project: {
            deliveredDate: 1,
            totalAmount: 1,
            addresstoDeliver: 1,
            _id: 1,
            // Calculate the sum of priceDifference and couponDiscountDifference for each order
            discount: {
              $add: [
                { $ifNull: ["$productInfo.priceDifference", 0] },
                { $ifNull: ["$couponDiscountDifference", 0] },
              ],
            },
          },
        },
      ]);
      res.json({ orders });
      console.log(orders);
    } else if (value === "today") {
      let discount = 0;
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      const orders = await orderSchema.aggregate([
        {
          $match: {
            orderStatus: { $in: ["Delivered"] },
            deliveredDate: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $project: {
            deliveredDate: 1,
            totalAmount: 1,
            products: 1,
            productDifference: 1,
            addresstoDeliver: 1,
            _id: 1,
            discount: {
              $add: [
                { $ifNull: ["$productInfo.priceDifference", 0] },
                { $ifNull: ["$couponDiscountDifference", 0] },
              ],
            },
          },
        },
        { $sort: { deliveredDate: -1 } },
      ]);
      res.json({ orders });
    } else if (value === "weekly") {
      const today = new Date();
      const currentDay = today.getDay();
      const startofWeek = new Date(today);
      startofWeek.setDate(today.getDate() - currentDay);
      startofWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6 - currentDay);
      endOfWeek.setHours(23, 59, 59, 999);
      const orders = await orderSchema.aggregate([
        {
          $match: {
            orderStatus: { $in: ["Delivered"] },
            deliveredDate: {
              $gte: startofWeek,
              $lte: endOfWeek,
            },
          },
        },
        {
          $project: {
            deliveredDate: 1,
            totalAmount: 1,
            products: 1,
            addresstoDeliver: 1,
            _id: 1,
            discount: {
              $add: [
                { $ifNull: ["$productInfo.priceDifference", 0] },
                { $ifNull: ["$couponDiscountDifference", 0] },
              ],
            },
          },
        },
      ]);
      res.json({ orders });
    } else if (value === "monthly") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const orders = await orderSchema.aggregate([
        {
          $match: {
            orderStatus: { $in: ["Delivered"] },
            deliveredDate: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        {
          $project: {
            deliveredDate: 1,
            totalAmount: 1,
            products: 1,
            discount: {
              $add: [
                { $ifNull: ["$productInfo.priceDifference", 0] },
                { $ifNull: ["$couponDiscountDifference", 0] },
              ],
            },
            addresstoDeliver: 1,
            trackingId: 1,
          },
        },
      ]);
      res.json({ orders });
    } else if (value === "yearly") {
      const today = new Date();
      const startofYear = new Date(today.getFullYear(), 0, 1);
      const endofYear = new Date(
        today.getFullYear() + 1,
        0,
        0,
        23,
        59,
        59,
        999
      );
      const orders = await orderSchema.aggregate([
        {
          $match: {
            orderStatus: { $in: ["Delivered"] },
            deliveredDate: {
              $gte: startofYear,
              $lte: endofYear,
            },
          },
        },
        {
          $project: {
            deliveredDate: 1,
            totalAmount: 1,
            priceDifference: 1,
            addresstoDeliver: 1,
            _id: 1,
            products: 1,
            discount: {
              $add: [
                { $ifNull: ["$productInfo.priceDifference", 0] },
                { $ifNull: ["$couponDiscountDifference", 0] },
              ],
            },
          },
        },
        {
          $sort: { deliveredDate: -1 },
        },
      ]);
      res.json({ orders });
    } else {
      res.json({ message: "Invalid filter value" });
      return;
    }
  } catch (error) {
    console.error("An error occurred", error);
    res.render("error");
  }
};

adminController.filterByDate = async (req, res) => {
  try {
    let { startingDate, endingDate } = req.body;
    startingDate = new Date(startingDate);
    endingDate = new Date(endingDate);

    const orders = await orderSchema.aggregate([
      {
        $match: {
          orderStatus: { $in: ["Delivered"] },
          deliveredDate: {
            $gte: startingDate,
            $lte: endingDate,
          },
        },
      },
      {
        $unwind: "$products", // Unwind the products array
      },
      {
        $lookup: {
          from: "products", // The name of the product collection
          localField: "products.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo", // Unwind the productInfo array
      },
      {
        $project: {
          deliveredDate: 1,
          totalAmount: 1,
          addresstoDeliver: 1,
          _id: 1,
          // Calculate the sum of priceDifference and couponDiscountDifference for each order
          discount: {
            $add: [
              { $ifNull: ["$productInfo.priceDifference", 0] },
              { $ifNull: ["$couponDiscountDifference", 0] },
            ],
          },
        },
      },
      {
        $sort: { deliveredDate: -1 },
      },
    ]);

    res.json({ orders });
  } catch (error) {
    console.error("An error occurred", error);
    res.render("error");
  }
};

adminController.generatePDF = async (req, res) => {
  try {
    const salesData = req.body;
    console.log("SALESDATAex", req.body);
    const pdfDoc = new pdf();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment;filename=sales-report.pdf"
    );
    pdfDoc.pipe(res);
    pdfDoc.fontSize(12);
    const title = "Sales report-G-HUB";
    let subtitle;

    salesData.forEach((entry) => {
      if (entry.startingDate && entry.endingDate) {
        subtitle = `Data from ${entry.startingDate} to ${entry.endingDate}`;
      } else {
        subtitle = `${entry.filterDrop.toUpperCase()} Sales`; // adding desired subtitle
      }
    });

    pdfDoc.text(title, { align: "center", underline: true });
    pdfDoc.moveDown(); // giving space
    pdfDoc.text(subtitle, { align: "center" }); // add subtitle
    pdfDoc.moveDown();

    let totalOrders = 0;
    let totalAmount = 0;
    let totalDiscount = 0;
    const tableHeaders = [
      "Order ID",
      "Total Amount(Rs)",
      "Delivered Date",
      "Discount",
    ];
    let tableX = 50;
    let tableY = pdfDoc.y + 40;

    tableHeaders.forEach((header, index) => {
      if (index === 3) {
        // Adjust the starting position for "Total Amount" heading
        pdfDoc.text(header, tableX, tableY, { width: 150, align: "left" });
      } else {
        pdfDoc.text(header, tableX + 40, tableY, { width: 150, align: "left" });
      }
      tableX += 150;
    });

    // Draw horizontal lines for the header
    pdfDoc
      .moveTo(50, tableY + 20)
      .lineTo(550, tableY + 20)
      .lineWidth(1)
      .stroke();

    // moving to the next row
    tableY += 20;

    console.log("SALESDATA", salesData);
    salesData.forEach((entry) => {
      tableX = 50; // resetting x coordinate for each row

      // Draw horizontal lines for the row
      pdfDoc.moveTo(50, tableY).lineTo(550, tableY).lineWidth(1).stroke();

      pdfDoc.text(entry.orderId, tableX, tableY + 5, {
        width: 200,
        align: "left",
      });

      tableX += 200;
      pdfDoc.text(`Rs:${entry.totalAmount}`, tableX + 20, tableY + 5, {
        width: 150,
        align: "left",
      });

      tableX += 120;
      pdfDoc.text(entry.date, tableX + 20, tableY + 5, {
        width: 150,
        align: "left",
      });
      tableX += 120;
      const cleanedDiscount = entry.discount.replace(/[^0-9.]/g, "");

      pdfDoc.text(`Rs:${cleanedDiscount}`, tableX + 20, tableY + 5, {
        width: 150,
        align: "left",
      });

      totalOrders += 1;
      totalAmount += entry.totalAmount;
      totalDiscount += parseFloat(cleanedDiscount);

      // Move to the next row
      tableY += 20;

      // Draw horizontal lines for the row
      pdfDoc.moveTo(50, tableY).lineTo(550, tableY).lineWidth(1).stroke();
    });

    // Draw horizontal lines for the last row
    pdfDoc.moveTo(50, tableY).lineTo(500, tableY).lineWidth(1).stroke();

    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.moveDown();
    pdfDoc.text(`Total Orders: ${totalOrders}`, 50, pdfDoc.y, {
      width: 150,
      align: "left",
    });
    pdfDoc.moveDown();
    pdfDoc.text(`Total Amount: Rs:${totalAmount}`);
    pdfDoc.moveDown();
    pdfDoc.text(`Total Discount: Rs:${totalDiscount}`);
    pdfDoc.moveDown();
    pdfDoc.end();
  } catch (error) {
    res.render("error");
    console.log("Error occurred during generating pdf", error);
  }
};

adminController.generateSalesExcel = async (req, res) => {
  try {
    const salesData = req.body;
    console.log("SALESDATApdf", salesData);

    // Create a new Excel workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Define the columns in the Excel sheet
    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 15 },
      { header: "Total Amount (Rs)", key: "totalAmount", width: 20 },
      { header: "Delivered Date", key: "date", width: 15 },
      { header: "Total Discount (Rs)", key: "discount", width: 20 },
    ];

    // Add data to the worksheet
    salesData.forEach((entry) => {
      worksheet.addRow({
        orderId: entry.orderId,
        totalAmount: `Rs:${entry.totalAmount}`,
        date: entry.date,
        discount: `Rs:${entry.discount}`, // Add this line for discount
      });
    });

    // Set up totalOrders and totalAmount
    let totalOrders = salesData.length;
    let totalAmount = salesData.reduce(
      (total, entry) => total + entry.totalAmount,
      0
    );
    let totalDiscount = salesData.reduce(
      (total, entry) => total + entry.discount,
      0
    );

    // Add a row for totalOrders, totalAmount, and totalDiscount
    worksheet.addRow({
      orderId: "Total Orders",
      totalAmount: totalOrders,
      date: "",
      discount: "",
    });
    worksheet.addRow({
      orderId: "Total Amount",
      totalAmount: `Rs:${totalAmount}`,
      date: "",
      discount: "",
    });
    worksheet.addRow({
      orderId: "Total Discount",
      totalAmount: `Rs:${totalDiscount}`,
      date: "",
      discount: "",
    });

    // Return the Excel workbook
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report.xlsx`
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);

    // End the response
    res.end();
  } catch (error) {
    console.log(
      "An error occurred while downloading Excel report",
      error.message
    );
    res.render("error");
  }
};

adminController.customerComplaints = async (req, res) => {
  const complaints = await customerCareSchema.find();
  res.render("customerComplaints", { complaints });
};

adminController.complaintDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const complaint = await customerCareSchema.findById(id);
    res.render("complaint-Details", { complaint });
  } catch (error) {
    console.log("error occured ", error);
  }
};

adminController.replyConcern = async (req, res) => {
  try {
    console.log("IN REPLY CONCERN");
    const id = req.params.id;
    console.log("ID", id);

    const { reply } = req.body;
    console.log("REPLY", reply);
    const complaint = await customerCareSchema.findById(id);
    console.log("COMPLAINTAINT", complaint);
    const userEmail = complaint.email;
    console.log("USERMAIL", userEmail);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Message from G_HUB",
      text: reply,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("error", error);
        return res.json({ status: "error", message: "Failed to send email" });
      } else {
        console.log("Email send");
        res.json({ status: "success", message: "Replay sended successfully" });
      }
    });
  } catch (error) {
    console.log("error", error);
  }
};
module.exports = adminController;
