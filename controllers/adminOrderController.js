    const orderSchema=require('../models/orderSchema')
    const productSchema=require('../models/product')
    const adminOrderController={}
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
                const searchRegex = new RegExp(req.query.search, 'i');
                matchQuery = { _id: { $regex: searchRegex } };
            }
    
            if (req.query.orderStatus) {
                matchQuery.orderStatus = req.query.orderStatus;
            }
    
            const orders = await orderSchema.aggregate([
                { $match: matchQuery },
                { $lookup: { from: 'products', localField: 'products.productId', foreignField: '_id', as: 'productsData' } },
                { $sort: { date: -1, _id: -1 } },
                { $skip: offset },
                { $limit: productsPerPage }
            ]).exec();
    
            res.render('adminOrders', { orders, productsPerPage, currentPage: page, totalPages, searchQuery: req.query.search, orderStatus: req.query.orderStatus });
        } catch (error) {
            console.log("An error occurred while loading admin orders", error);
            res.render('error');
        }
    };
    
    //showing the orderdetails
    adminOrderController.orderDetails = async (req, res) => {
        try {
            const orderID = req.params.id;
            console.log("In orderdetails",orderID)
            const orders = await orderSchema.findById(orderID)
                .populate({ path: 'products.productId', select: 'name' })
                .populate('userId', 'username addresstoDeliver');

            if (!orders) {
                return res.redirect('/admin/orders');
            }
            console.log("orders",orders);

            res.render('adminOrderDetails', { orders });
        } catch (error) {
            console.log("Error occurred during showing admin order details", error);
            res.render('error');
        }
    }


//changint the orderstatus of products
    adminOrderController.changeOrderStatus = async (req, res) => {
        try {
            console.log("IN ORDERstatus");
            const { status, orderId } = req.body;
            console.log("Request Body:", req.body);
    
            const orderData = await orderSchema.findById(orderId).populate('products.productId');
            console.log("ORDERDATA", orderData);
    
            const existingStatus = orderData.orderStatus;
            console.log("Existing status", existingStatus);
    
            if (existingStatus === 'Cancelled') {
                return res.json({status:"error",message:"Already cancelled so no more operations"})
            }

            else 
            {
                for (const productInfo of orderData.products) {
                    const productId = productInfo.productId._id;
                    const quantity = productInfo.quantity;
    
                    // Update the stock for each product
                    await productSchema.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
                }
    
                orderData.orderStatus = status;
                console.log("Updated Order Status:", orderData.orderStatus);
                if(status==="Delivered")
                {
                    orderData.deliveredDate=new Date()
                }
                await orderData.save();
                console.log("Status changed");
                return res.json({ status: "success", message: "Order status updated successfully" });

            }
        } catch (error) {
            console.log("Error updating order status:", error);
            return res.json({ status: "error", message: "An error occurred while updating order status" });
        }
    };







    module.exports=adminOrderController