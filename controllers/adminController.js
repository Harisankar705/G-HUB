  const adminSchema = require('../models/adminSchema');
  const bcrypt = require('bcrypt');
  const adminController = {};
  const userSchema=require('../models/User')
  const orderSchema=require('../models/orderSchema')
  const categorySchema=require('../models/category')
  const productSchema=require('../models/product')
  const pdf=require('pdfkit')
  const fs=require('fs')
  const exceljs=require('exceljs');

  //adminlogin
  adminController.showAdminLogin = async (req, res) => {
    if (!req.session.AdminLogin) {
      res.render('admin', { message: '' });
    } else {
      res.redirect('/adminpanel');
    }
  };

  //post adminlogin
  adminController.handleAdminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
      const admin = await adminSchema.findOne({ email });
      
      if (!admin) {
        return res.render('admin', { message: 'Admin not found', messageType: 'danger' });
      }

      if (!(await bcrypt.compare(password, admin.password))) {
        return res.render('admin', { message: 'Invalid password', messageType: 'danger' });
      }

      req.session.AdminLogin = true;
      res.redirect('/adminpanel');
    } catch (error) {
      console.error('Error in admin login:', error);
      res.status(500).send('Internal server error');
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
                  res.redirect('/admin'); // You might want to redirect the user after successful logout
              }
          });
      } catch (error) {
          console.log("Error during logout", error);
          res.status(500).send("Internal Server Error");
      }
  };
    

  //chart
  async function chart()
  {
    try {
      const ordersPie=await orderSchema.find()
      const ordersCount={
        pending:0,
        shipped:0,
        processing:0,
        delivered:0,
        retuned:0,
      }
      ordersPie.forEach((order)=>{
        if(order.orderStatus==='Pending')
        {
          ordersCount.pending++
        }
        else if(order.orderStatus=== 'Shipped')
        {
          ordersCount.shipped++
        }
        else if(order.orderStatus==="Processing")
        {
          ordersCount.processing++
        }
        else if(order.orderStatus==="delivered")
        {
          ordersCount.delivered++
        }else{
          ordersCount.retuned++
        }
      })
      return ordersCount
    } catch (error) {
      console.log("Error occured during order count function",error)
      res.render('error')
    }
  }
  //count of orders based on month
  async function graph() {
    try {
      const orderCountofMonth = await orderSchema.aggregate([
        {
          $project: {
            month: { $month: "$date" }
          }
        },
        {
          $group: {
            _id: "$month",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
      //getting numeric month id
      const orderCountofMonthwithNames=orderCountofMonth.map(entry=>({
        month:months[entry._id-1],
        count:entry.count
      }))
      const labels=orderCountofMonthwithNames.map((val=>val.month))
      const count=orderCountofMonthwithNames.map((val)=>val.count)
      return {
        labels: labels,
        count: count
      }
      
    } catch (error) {
      console.error("Error in graph function:", error);
    }
  }
  //current month weekly sale
  async function barGraph()
  {
    try {
      const currentMonth=new Date().getMonth()+1
      const currentYear=new Date().getFullYear
      const ordersCountByWeek=await orderSchema.aggregate([
        {
          $match:{
            date:{
              $gte:new Date(`${currentYear}-${currentMonth}-01`),
              $lt:new Date(`${currentYear}-${currentMonth+1}-01`)
            }
          }
        },
        {
          $project:{
            week:{$isoWeek:"$date"}
          }
        },
        {
          $group:{
            _id:'$week',
            count:{$sum:1}
          }
        },
        {
          $sort:{_id:1}
        }
      ])

      const mapIsoWeektoWeek=$isoWeek=>{
        return `Week ${$isoWeek}`
      }

      const orderCountofweekwithNames=ordersCountByWeek.map(entry=>({
        week:mapIsoWeektoWeek(entry._id),
        count:entry.count
      }))

      const labels=orderCountofweekwithNames.map(val=>val.week)
      const count=orderCountofweekwithNames.map(val=>val.count)

      return {
        labels: labels,
        count: count
      }
      


    } catch (error) {
      console.log("Error occured during week orders in bargraph",error)
    }
  }
  adminController.showAdminPanel = async (req, res) => {
    try {
      if (req.session.AdminLogin) {
        const orders = await orderSchema.aggregate([
          {
            $match: {
              orderStatus: { $in: ['Delivered', 'Cancelled'] }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' }
            }
          }
        ]);

        const [
          ordersData,
          totalOrders,
          totalProducts,
          totalCategory,
          totalUsers,
          ordersPie,
          ordersGraph,
          ordersBarGraph
        ] = await Promise.all([
          orderSchema.find({ orderStatus: { $in: ['Delivered', 'Cancelled'] } }).populate('products.productId'),
          orderSchema.countDocuments({ orderStatus: { $in: ['Delivered', 'Cancelled'] } }),
          productSchema.countDocuments(),
          categorySchema.countDocuments(),
          userSchema.countDocuments(),
          chart(),
          graph(),
          barGraph()
        ]);
        console.log("ORDERSDATA",ordersData)
        const labels = [...ordersGraph.labels]; // months
        const count = [...ordersGraph.count];
        const weeks = [...ordersBarGraph.labels];
        const weekCount = [...ordersBarGraph.count];

        const totalRevenue = orders.length > 0 ? orders[0].totalRevenue : 0;

        res.render('adminPanel', {
          totalRevenue,
          totalOrders,
          totalCategory,
          totalProducts,
          totalUsers,
          ordersPie,
          labels,
          count,
          weeks,
          weekCount,
          ordersData,
        });
      } else {
        res.redirect('/admin'); // Redirect to login page if not logged in
      }
    } catch (error) {
      console.error('Error in showing admin panel:', error);
      res.status(500).render('error');
    }
  };

  //filter sale report
  adminController.filterSales = async (req, res) => {
    try {
        const value = req.query.by;
        const today = Date.now();

      

        if(value==='all')
        {
          const orders=await orderSchema.aggregate([
            {
              $match:{orderStatus:{$in:["Delivered"]}}
            },
            {
              $sort:{deliveredDate:-1}
            }
          ])
          res.json({orders})
        }
        else if (value === 'today') {
            const startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            const orders=await orderSchema.aggregate([
              {
                $match:{orderStatus:{$in:['Delivered']},
                deliveredDate:{
                  $gte:startDate,
                  $lt:endDate
                }
              }
            },
            {
              $project:{
                deliveredDate:1,
                totalAmount:1,
                products:1,
                productDifference:1,
                _id:1
              }
            },
            {$sort:{deliveredDate:-1}}
            ])
            res.json(({orders}))
        } else if (value === 'weekly') {
            const today = new Date();
            const currentDay = today.getDay();
            const startofWeek = new Date(today);
            startofWeek.setDate(today.getDate() - currentDay);
            startofWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + 6 - currentDay);
            endOfWeek.setHours(23, 59, 59, 999);
            const orders=await orderSchema.aggregate([
              {
                $match:{
                  orderStatus:{$in:["Delivered"]},
                  deliveredDate:{$gte:startofWeek, $lte:endOfWeek
                }
              }
            },
            {
              $project:{
                deliveredDate:1,
                totalAmount:1,
                products:1,
                addresstoDeliver:1,
                priceDifference:1,
                _id:1
              }
            }
            ])
            res.json({orders})
        } else if (value === 'monthly') {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            const orders=await orderSchema.aggregate([
              {
                $match:{
                  orderStatus:{$in:["Delivered"]},
                  deliveredDate:{
                    $gte:startOfMonth,
                    $lte:endOfMonth
                  }
                }
              },
              {
                $project:{
                  deliveredDate:1,
                  totalAmount:1,
                  products:1,
                  priceDifference:1,
                  addresstoDeliver:1,
                  trackingId:1
                }
              }
            ])
            res.json({orders})
        } else if (value === 'yearly') {
            const today = new Date();
            const startofYear = new Date(today.getFullYear(), 0, 1);
            const endofYear = new Date(today.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
            const orders=await orderSchema.aggregate([
              {
                $match:{
                  orderStatus:{$in:["Delivered"]},
                  deliveredDate:{
                    $gte:startofYear,
                    $lte:endofYear
                  }

                }
              },
              {
                $project:{
                  deliveredDate:1,
                  totalAmount:1,
                  priceDifference:1,
                  addresstoDeliver:1,
                  _id:1,
                  products:1
                }
              },
              {
                $sort:{deliveredDate:-1}
              }
            ])
            res.json({orders})
        } else {
            res.json({ message: 'Invalid filter value' });
            return;
        };

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
        console.error("An error occurred", error);
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
                      $lte: endingDate
                  }
              }
          },
          {
              $project: {
                  deliveredDate: 1,
                  totalAmount: 1,
                  priceDifference: 1,
                  addresstoDeliver: 1,
                  _id: 1
              }
          },
          {
              $sort: { deliveredDate: -1 }
          }
      ]);

      res.json({ orders });
  } catch (error) {
      console.error("An error occurred", error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};




adminController.generatePDF = async (req, res) => {
  try {
      const salesData = req.body;
      console.log("SALESDATAex", req.body)
      const pdfDoc = new pdf();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment;filename=sales-report.pdf');
      pdfDoc.pipe(res);
      pdfDoc.fontSize(12);
      const title = 'Sales report-G-HUB';
      let subtitle;

      salesData.forEach(entry => {
          if (entry.startingDate && entry.endingDate) {
              subtitle = `Data from ${entry.startingDate} to ${entry.endingDate}`;
          } else {
              subtitle = `${entry.filterDrop.toUpperCase()} Sales`; // adding desired subtitle
          }
      });

      pdfDoc.text(title, { align: 'center', underline: true });
      pdfDoc.moveDown(); // giving space
      pdfDoc.text(subtitle, { align: 'center' }); // add subtitle
      pdfDoc.moveDown();

      let totalOrders = 0;
      let totalAmount = 0;
      let totalDiscount = 0;
      const tableHeaders = ['Order ID', 'Total Amount(Rs)', 'Delivered Date', 'Discount'];
      let tableX = 50;
      let tableY = pdfDoc.y + 40;

      tableHeaders.forEach((header, index) => {
          if (index === 3) {
              // Adjust the starting position for "Total Amount" heading
              pdfDoc.text(header, tableX, tableY, { width: 150, align: 'left' });
          } else {
              pdfDoc.text(header, tableX + 40, tableY, { width: 150, align: 'left' });
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

      console.log('SALESDATA', salesData);
      salesData.forEach(entry => {
          tableX = 50; // resetting x coordinate for each row

          // Draw horizontal lines for the row
          pdfDoc
              .moveTo(50, tableY)
              .lineTo(550, tableY)
              .lineWidth(1)
              .stroke();

          pdfDoc.text(entry.orderId, tableX, tableY + 5, { width: 200, align: 'left' });

          tableX += 200;
          pdfDoc.text(`Rs:${entry.totalAmount}`, tableX + 20, tableY + 5, { width: 150, align: 'left' });

          tableX += 120;
          pdfDoc.text(entry.date, tableX + 20, tableY + 5, { width: 150, align: 'left' });
          tableX += 120;
          const cleanedDiscount = entry.discount.replace(/[^0-9.]/g, '');

          pdfDoc.text(`Rs:${cleanedDiscount}`, tableX + 20, tableY + 5, { width: 150, align: 'left' });

          totalOrders += 1;
          totalAmount += entry.totalAmount;
          totalDiscount += entry.discount;

          // Move to the next row
          tableY += 20;

          // Draw horizontal lines for the row
          pdfDoc
              .moveTo(50, tableY)
              .lineTo(550, tableY)
              .lineWidth(1)
              .stroke();
      });

      // Draw horizontal lines for the last row
      pdfDoc
          .moveTo(50, tableY)
          .lineTo(500, tableY)
          .lineWidth(1)
          .stroke();

      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.text(`Total Orders: ${totalOrders}`, 50, pdfDoc.y, { width: 150, align: 'left' });
      pdfDoc.moveDown()
      pdfDoc.text(`Total Amount: Rs:${totalAmount}`);
      pdfDoc.moveDown()
      pdfDoc.text(`Total Discount: Rs:${totalDiscount}`);
      pdfDoc.moveDown()
      pdfDoc.end();
  } catch (error) {
      res.render('error');
      console.log('Error occurred during generating pdf', error);
  }
};


adminController.generateSalesExcel = async (req, res) => {
  try {
      const salesData = req.body;
      console.log("SALESDATApdf", salesData);

      // Create a new Excel workbook
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      // Define the columns in the Excel sheet
      worksheet.columns = [
          { header: 'Order ID', key: 'orderId', width: 15 },
          { header: 'Total Amount (Rs)', key: 'totalAmount', width: 20 },
          { header: 'Delivered Date', key: 'date', width: 15 },
          { header: 'Total Discount (Rs)', key: 'discount', width: 20 },
      ];

      // Add data to the worksheet
      salesData.forEach(entry => {
          worksheet.addRow({
              orderId: entry.orderId,
              totalAmount: `Rs:${entry.totalAmount}`,
              date: entry.date,
              discount: `Rs:${entry.discount}`, // Add this line for discount
          });
      });

      // Set up totalOrders and totalAmount
      let totalOrders = salesData.length;
      let totalAmount = salesData.reduce((total, entry) => total + entry.totalAmount, 0);
      let totalDiscount=salesData.reduce((total,entry)=>total+entry.discount,0)

      // Add a row for totalOrders, totalAmount, and totalDiscount
      worksheet.addRow({ orderId: 'Total Orders', totalAmount: totalOrders, date: '', discount: '' });
      worksheet.addRow({ orderId: 'Total Amount', totalAmount: `Rs:${totalAmount}`, date: '', discount: '' });
      worksheet.addRow({ orderId: 'Total Discount', totalAmount: `Rs:${totalDiscount}`, date: '', discount: '' });

      // Return the Excel workbook
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report.xlsx`);

      // Write the workbook to the response
      await workbook.xlsx.write(res);

      // End the response
      res.end();
  } catch (error) {
      console.log("An error occurred while downloading Excel report", error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

  module.exports = adminController;
