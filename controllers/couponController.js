const coupon = require('../models/couponSchema')
const couponSchema=require('../models/couponSchema')
const cartSchema=require('../models/cartSchema')

const couponController={}
couponController.showAdminCoupons=async(req,res)=>{
    try {
        const productsPerPage=10
        const page=parseInt(req.query.page)||1
        const limit=5
        const offset=(page-1)*limit
        const totalCoupons=await couponSchema.countDocuments()
        const totalPages=Math.ceil(totalCoupons/productsPerPage)
        const coupons=await couponSchema.find().skip().limit(productsPerPage)
        res.render('adminCoupons',{coupons,totalPages,currentPage:page})
    } catch (error) {
        console.log("Error occured while showing adminCoupons")
    }
}

couponController.displayAddCoupon=async(req,res)=>{
    try {
        res.render('addCoupons')
    } catch (error) {
        console.log("Error showing add coupons")
    }
}
couponController.addingCoupon = async (req, res) => {
  try {
      const { offerName, couponCode, priceRange, discountOffer, expire } = req.body;

      // Validate input fields
      if (!offerName || !couponCode || !priceRange || !discountOffer || !expire) {
          return res.json({ status: "error", message: "Enter all the fields" });
      }

      // Trim spaces from all fields
      const trimmedOfferName = offerName.trim();
      const trimmedCouponCode = couponCode.trim();

      // Check if any of the trimmed fields are empty
      if (!trimmedOfferName || !trimmedCouponCode || !priceRange || !discountOffer || !expire) {
          return res.json({ status: "error", message: "Fields cannot have empty spaces" });
      }
      const currentDate=Date.now()
      const expireData=new Date(expire)
      if(expireData.getTime()<=currentDate)
      {
        return res.json({status:"error",message:"Date expired"})
      }
    
      const exisitingCoupon=await couponSchema.findOne({offerName:trimmedOfferName})
      if(exisitingCoupon)
      {
        return res.json({status:"error",message:"same coupon name exists"})
      }

      // Convert price range and discount offer to numbers
      const rangeNumber = parseInt(priceRange);
      const discountNumber = parseFloat(discountOffer);

      // Check for valid numbers
      if (isNaN(rangeNumber) || isNaN(discountNumber)) {
          return res.json({ status: "error", message: "Enter valid price range / offer" });
      }

      // Check if discount is within valid range (greater than zero and less than 100)
      if (discountNumber <= 0 || discountNumber >= 100) {
          return res.json({ status: "error", message: "Discount should be greater than 0 and less than 100" });
      }

      // Check if the price is greater than zero
      if (rangeNumber <= 0) {
          return res.json({ status: "error", message: "Price range should be greater than zero" });
      }

      // Create a new coupon
      const newCoupon = new couponSchema({
          offerName: trimmedOfferName,
          coupon: trimmedCouponCode,
          range: rangeNumber,
          discount: discountNumber,
          expire: new Date(expire),
          isActive: true,
          usedBy: [],
      });

      // Save the new coupon to the database
      const savedCoupon = await newCoupon.save();

      // Respond with success message
      res.json({ status: "success", message: "Coupon created successfully" });
  } catch (error) {
      console.log("Error occurred during adding Coupon", error);
      // Respond with an error message
      res.json({ status: "error", message: "Error occurred during adding Coupon" });
  }
};



couponController.applyCoupon = async (req, res) => {
  try {
      console.log("in apply coupon");
      const userId = req.session.userId;
      const couponCode = req.body.couponCode;
      console.log("coupon", couponCode);
      console.log(req.body);

      if (couponCode.trim() === "") {
          return res.json({ status: "error", message: "Enter a coupon" });
      }

      // Check if the user has already applied a coupon
      const existingCoupon = await couponSchema.findOne({
          usedBy: userId
      });

      if (existingCoupon) {
          return res.json({ status: "error", message: "You have already applied a coupon" });
      }

      const enteredCoupon = await couponSchema.findOne({ coupon: couponCode });

      if (!enteredCoupon) {
          return res.json({ status: "error", message: "Coupon not available" });
      }

      const usedCoupon = await couponSchema.findOne({
          coupon: couponCode,
          usedBy: userId,
      });

      if (usedCoupon) {
          return res.json({ status: "error", message: "Coupon already used" });
      }

      const cart = await cartSchema.findOne({ userId: userId });
      const products = cart.products;

      // Calculate total in cart before applying discount
      cart.total = products.reduce((total, product) => {
          return total + product.total;
      }, 0);

      const totalInCart = cart.total;

      // Apply coupon discount and calculate new grand total
      const couponDiscount = enteredCoupon.discount;
      const grandTotal = Math.ceil(totalInCart - totalInCart * couponDiscount / 100);
      const couponId = enteredCoupon._id;

      // Mark the coupon as used by the current user
      enteredCoupon.usedBy.push(userId);
      await enteredCoupon.save();

      res.json({
          status: "success",
          discount: couponDiscount,
          grandTotal: grandTotal,
          couponId: couponId
      });
  } catch (error) {
      console.log("Error occurred while applying discount", error);
      res.json({
          status: "error",
          message: "Error occurred while applying discount",
      });
  }
};

couponController.deleteCoupon=async(req,res)=>{
    try {
        console.log("in delete coupon")
        const couponId=req.params.id
        console.log("COUPOINID",couponId)
        const coupon=await couponSchema.findById(couponId)
        if(!coupon)
        {
            return res.json({status:"Error",message:"Coupon not found"})

        }
        await coupon.deleteOne()
        return res.json({status:"success",message:"Coupon removed successfully"})
    } catch (error) {
        console.log("Error occured while removing coupon",error)
    }
}

couponController.showeditCoupon=async(req,res)=>{
    try {
        const couponId=req.params.id
        const coupon=await couponSchema.findById(couponId)
        res.render('editCoupon',{coupon})
    } catch (error) {
        console.log("Error occured during showing edit coupon",error)
    }
}
  

couponController.handleEditedCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await couponSchema.findById(couponId);
        const { offerName, couponCode, priceRange, discountOffer, expire } = req.body;

        // Validate input fields
        if (!offerName && !couponCode && !priceRange && !discountOffer && !expire) {
            return res.json({ status: "error", message: "No fields to update" });
        }

        // Trim spaces from non-empty fields
        const trimmedOfferName = offerName ? offerName.trim() : coupon.offerName;
        const trimmedCouponCode = couponCode ? couponCode.trim() : coupon.coupon;

        // Check if expiration date is provided and not expired
        const currentDate = Date.now();
        const expireData = expire ? new Date(expire) : coupon.expire;
        if (expireData.getTime() <= currentDate) {
            return res.json({ status: "error", message: "Date expired" });
        }

        // Check if updated coupon name already exists
        if (trimmedOfferName !== coupon.offerName) {
            const existingCoupon = await couponSchema.findOne({ offerName: trimmedOfferName });
            if (existingCoupon) {
                return res.json({ status: "error", message: "Same coupon name exists" });
            }
        }

        // Convert updated price range and discount offer to numbers
        const rangeNumber = priceRange ? parseInt(priceRange) : coupon.range;
        const discountNumber = discountOffer ? parseFloat(discountOffer) : coupon.discount;

        // Check for valid numbers
        if (isNaN(rangeNumber) || isNaN(discountNumber)) {
            return res.json({ status: "error", message: "Enter valid price range / offer" });
        }

        // Check if discount is within valid range (greater than zero and less than 100)
        if (discountNumber <= 0 || discountNumber >= 100) {
            return res.json({ status: "error", message: "Discount should be greater than 0 and less than 100" });
        }

        // Check if the price is greater than zero
        if (rangeNumber <= 0) {
            return res.json({ status: "error", message: "Price range should be greater than zero" });
        }

        // Update only the fields that have been provided
        const updateFields = {
            offerName: trimmedOfferName,
            coupon: trimmedCouponCode,
            range: rangeNumber,
            discount: discountNumber,
            expire: expireData,
        };

        await couponSchema.updateOne({ _id: couponId }, { $set: updateFields });

        res.json({ status: "success", message: "Coupon edited successfully" });
    } catch (error) {
        console.log("Error in editing a Coupon: ", error);
        res.json({ status: 'error', message: 'Internal Error' });
    }
};

module.exports=couponController