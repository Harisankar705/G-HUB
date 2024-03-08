const mongoose=require('mongoose')
const productSchema=require('../models/product')
const categorySchema=require('../models/category')
const offerSchema=require('../models/offerSchema')
const userSchema=require('../models/User')
const { ObjectId } = require('mongoose');

const offer = require('../models/offerSchema')
const User = require('../models/User')
const offerManagementController={}

offerManagementController.showOffers=async(req,res)=>{
    const allOffers=await offerSchema.find().populate('selectedCategory').populate('selectedProducts')
        let updateMessage=req.query.updateMessage|| ''
    try {
        await offerManagementController.checkAndExpireOffers()
        res.render('offerManagement',{allOffers,message:"",updateMessage})
    } catch (error) {
        console.log("error occured during showing offers",error)
        res.render('error')
    }
}

offerManagementController.displayAddOffer=async(req,res)=>{
    try {
        const products=await productSchema.find()
        const categories=await categorySchema.find()
        res.render('addOffer',{products,categories})
    } catch (error) {
        console.log("error occured during  displayingaddOffer",error)
        res.render('error')
    }
}
 offerManagementController.checkAndExpireOffers=async(req,res)=>
 {
    try {
        const expiredOffers=await offerSchema.find({isActive:true,endDate:{$lte:Date.now()}})
        for(const offer of expiredOffers)
        {
            offer.isActive=false;
            await offer.save()

            if(offer.discountOn==='product' && offer.selectedProducts)
            {
                const productId=offer.selectedProducts;
                const product=await productSchema.findOne({productId:productId})
                product.price=product.originalPrice 
                product.originalPrice=0;
                product.discount=0
                await product.save()
            }
            else if(offer.discounOn==='category' && offer.selectedCategory)
            {
                const categoryId=offer.selectedCategory
                const productsInCategory=await productSchema.find({category:categoryId})
                for(const product of productsInCategory)
                {
                    product.price=product.originalPrice
                    product.originalPrice=0;
                    product.discount=0;
                    await product.save()
                }
            }
        }
    } catch (error) {
        
    }
 }

 offerManagementController.manageaddOffer=async(req,res)=>{
    console.log("IN manageaddoffer")
    const products=await productSchema.find()
    const offer=await offerSchema.find()
    console.log(req.headers['content-type']);

    const categories=await categorySchema.find()
    const{
        offerName,
        discountOn,
        discountValue,
        startDate,
        endDate,
        selectedCategory,
        selectedProducts
    }=req.body
    console.log("BODUYES",req.body);
    try {
        const existingNameOffer=await offerSchema.findOne({offerName})
        const exisitingCategoryOffer=await offerSchema.findOne({selectedCategory})
        const exisitingProductOffer=await offerSchema.findOne({selectedProducts})
        if(existingNameOffer)
        {
            return res.json({status:"error",message:"Discount name already exists"})
        }
        if(selectedCategory && exisitingCategoryOffer)
        {
            return res.json({status:"error",message:"Offer for this category already exists"})
        }
        if(selectedProducts && exisitingProductOffer)
        {
            return res.json({status:"error",message:"Offer for this product already exists"})
        }
        const trimmedOfferName = offerName.trim();
        if (!trimmedOfferName) {
            return res.json({ status: "error", message: "Offer Name cannot be empty" });
        }

        if (discountOn !== 'category' && discountOn !== 'product') {
            return res.json({ status: "error", message: "Invalid value for discountOn" });
        }

        if (discountValue <= 0) {
            return res.json({ status: "error", message: "Discount value must be greater than zero" });
        }
        if(discountValue>100)
        {
            return res.json({status:"error",message:"Discount value must be less than 100"})
        }
        let currentDate=Date.now()
        if(endDate<=currentDate)
        {
            return res.json({status:"error",message:"End date must be in the future"})
        }
        if(startDate<currentDate)
        {
            return res.json({status:"error",message:"Date already expired"})
        }
        if(endDate<=startDate)
        {
            return res.json({status:"error",message:"End date must start after start date"})
        }
        let modifiedSelectedCategory=selectedCategory
        let modifiedProductCategory=selectedProducts
        if(discountOn==='category')
        {
            modifiedProductCategory=null;
            const selectedCategoryObjectId=new mongoose.Types.ObjectId(selectedCategory)
            modifiedSelectedCategory=selectedCategoryObjectId
            console.log("SELECTEDCATEGORY",selectedCategoryObjectId)
            await productSchema.updateMany(
                {category:modifiedSelectedCategory},
                {$set:{discount:discountValue}}
            )
            const productsInCategory = await productSchema.find({ category: modifiedSelectedCategory });
    for (const product of productsInCategory) {
        product.originalPrice = product.price;
        const discountedPrice = product.price - (product.price * discountValue / 100);
        product.price = discountedPrice;
        await product.save();
    }
        }
        else if(discountOn==='product')
        {
            modifiedSelectedCategory=null;
            modifiedProductCategory=selectedProducts
            const product=await productSchema.findOne({productId:modifiedProductCategory})
            if(product)
            {
                const discountedPrice=product.price-(product.price*discountValue)/100
                product.originalPrice=product.price
                product.discount=discountValue
                product.price=discountedPrice
                await product.save()

            }
        }
            const newOffer=new offerSchema({
                offerName,
                discountOn,
                discountValue,
                startDate,
                endDate,
                selectedCategory:modifiedSelectedCategory,
                selectedProducts:modifiedProductCategory
            })

            const savedOffer=await newOffer.save()
            res.json({status:"success",message:"Offer created successfuly"})
        
    } catch (error) {
       console.log("error occured while creting offer",error) 
    }
 }

 offerManagementController.toogleListOffer=async(req,res)=>{
    const offerId=req.params.offerId
    try {
        const offer=await offerSchema.findOne({_id:offerId})
        const allOffers=await offerSchema.find().populate('selectedCategory').populate('selectedProducts')
        if(offer)
        {
            if(offer.endDate<=new Date())
            {
                return res.json({status:"error",message:"Offer has expired"})
            }
            if(offer.discountOn==='category' && offer.selectedCategory)
            {
                const categoryId=offer.selectedCategory
                const products=await productSchema.find({category:categoryId})
                for(const product of products)
                {
                    if(offer.isActive)
                    {
                        product.price=product.originalPrice
                        product.originalPrice=0;
                        product.discount=0
                        product.priceDifference=0

                    }
                    else
                    {
                        product.originalPrice=product.price
                        const discountedPrice=product.price-(product.price*offer.discountValue)/100
                        product.price=discountedPrice
                        product.priceDifference=product.originalPrice-product.price
                        product.discount=offer.discountValue
                    }
                    await product.save()
                }
            }
            else if(offer.discountOn==="product" && offer.selectedProducts)
            {
                const productId=offer.selectedProducts
                const product=await productSchema.findOne({_id:productId})
                if(offer.isActive)
                {
                    product.price=product.originalPrice
                    product.originalPrice=0
                    product.discount=0
                    product.priceDifference=0

                }
                else
                {
                    product.originalPrice=product.price;
                    const discountedPrice=product.price-(product.price * offer.discountValue)/100
                    product.price=discountedPrice
                    product.priceDifference=product.originalPrice-product.price
                    product.discount=offer.discountValue
                }
                await product.save()
            }
            offer.isActive=!offer.isActive
            await offer.save()
            res.redirect('/offer-management')
        }
        else
        {
            res.json({status:"error",message:"Something happened"})
        }
    } catch (error) {
        console.log("Error occured while toggling offer status",error)
        res.render('error')
        
    }
 }

 offerManagementController.showEditOffer=async(req,res)=>{
    const offerId=req.params.offerId
    console.log("OFFERID",offerId)
    const products=await productSchema.find()
    const categories=await categorySchema.find()
    try {
        const offers=await offerSchema.findOne({_id:offerId})
        console.log("OFFERS",offers)
        const formattedStartDate = offers.startDate.toISOString().split('T')[0];
        const formattedEndDate = offers.endDate.toISOString().split('T')[0];
        res.render('editOffer',{offers,products,categories,offerId,formattedStartDate,formattedEndDate})
    } catch (error) {
        console.log("Error occured during loading editoffer",error)
        res.render('error')
    }
 }

 offerManagementController.handleEditOffer=async(req,res)=>
 {
    const offerId=req.params.offerId
    const{
        offerName,
        discountOn,
        discountValue,
        startDate,
        endDate,
        selectedCategory,
        selectedProducts
    }=req.body
    try {
        console.log("in edit offer")
        const offers=await offerSchema.findOne({_id:offerId})
        const products=await productSchema.find()
        const categories=await categorySchema.find()
        const formattedStartDate = offers.startDate.toISOString().split('T')[0];
        const formattedEndDate = offers.endDate.toISOString().split('T')[0];
        const trimmedOfferName = offerName.trim();
        if (!trimmedOfferName) {
            return res.json({ status: "error", message: "Offer Name cannot be empty" });
        }

        if (discountOn !== 'category' && discountOn !== 'product') {
            return res.json({ status: "error", message: "Invalid value for discountOn" });
        }

        if (discountValue <= 0) {
            return res.json({ status: "error", message: "Discount value must be greater than zero" });
        }
        if(discountValue>100)
        {
            return res.json({status:"error",message:"Discount value must be less than 100"})
        }
        let currentDate=Date.now()
        if(endDate<=currentDate)
        {
            return res.json({status:"error",message:"End date must be in the future"})
        }
        if(endDate<=startDate)
        {
            return res.json({status:"error",message:"End date must start after start date"})
        }
        if(offerName!==offers.offerName)
        {
            const exisitingOfferName=await offerSchema.findOne({offerName})
            if(exisitingOfferName)
            {
                return res.json({status:"error",message:"Duplicate discout name not allowed"})
            }

        }
        let modifiedSelectedCategory=selectedCategory
        let modifiedProductCategory=selectedProducts
        if(discountOn==="category")
        {
            if(selectedCategory!==offers.selectedCategory)
            {
                const exisitingCategoryOffer=await offerSchema.findOne({selectedCategory,_id:{$ne:offerId}})
                if(exisitingCategoryOffer)
                {
                    return res.json({status:"error",message:"An offer already exists"})
                }
            }
        
        modifiedProductCategory=null;
        const selectedCategoryObjectId=new mongoose.Types.ObjectId(selectedCategory)
        modifiedSelectedCategory=selectedCategoryObjectId
        }
        else if(discountOn==='product')
        {
            const exisitingProductOffer=await offerSchema.findOne({selectedProducts,_id:{$ne:offerId}})
            if(exisitingProductOffer)
            {
                return res.json({status:"error ",message:"Offer for this category already exists"})
            }
            modifiedSelectedCategory = null;

        const product=await productSchema.findOne({_id:modifiedProductCategory})
        if(product)
        {
            const discountedPrice=product.price-(product.price*discountValue)/100
            product.originalPrice=product.price
            product.discount=discountValue
            product.price=discountedPrice
            await product.save()
        }
    }
    const updatedOffer=await offerSchema.findByIdAndUpdate(offerId,{
        offerName,discountOn,discountValue,startDate,endDate,selectedCategory:modifiedSelectedCategory,selectedProducts:modifiedProductCategory
    })
    res.json({status:"success",message:"offer edited successfully"})
    } catch (error) {
        console.log("Error occured while editin offer",error)
        res.render('error')
    }
 }
  offerManagementController.deleteOffer=async (req, res) => {
        try {
            const offerId = req.params.offerId;
            const offer = await offerSchema.findById(offerId);

            if (!offer) {
                return res.json({ status: "error", message: "Offer not found" });
            }
            if(offer.discountOn==='category' && offer.selectedCategory)
            {
                const categoryId=offer.selectedCategory
                const productsInCategory=await productSchema.find({category:categoryId})
                for(const product of productsInCategory)
                {
                    product.price=product.originalPrice
                    product.originalPrice=0
                    product.discount=0
                    await product.save()
                }
            }
            else if(offer.disocuntOn==='products' && offer.selectedProducts)
            {
                const productId=offer.selectedProducts
                const product=await productSchema.findOne({_id:productId})
                if(product)
                {
                    product.price=product.originalPrice
                    product.originalPrice=0
                    product.disount=0
                    await product.save()
                }
            }
            await offer.deleteOne();

            return res.json({ status: "success", message: "Offer deleted" });
        } catch (error) {
            console.error("Error deleting offer:", error);
            return res.status(500).json({ status: "error", message: "Internal Server Error" });
        }
    }




 offerManagementController.referAndEarn = async (req, res) => {
    const userId = req.params.userId;
    const user = await userSchema.findById(userId);
    const referralCode = user.referralCode;
    
    // Rename the variable to avoid redeclaration
    const referralLinkInfo = await User.findOne({ referralCode: user.referralCode });
    const isReferralLinkUsed = referralLinkInfo ? referralLinkInfo.used : false;

    console.log("REFERRAL", referralCode);

    try {
        res.render('referralCode', { referralCode, user, isReferralLinkUsed, req });
    } catch (error) {
        console.log("Error occrued during referandearn",error)
        res.render('error')
    }
}


 module.exports=offerManagementController