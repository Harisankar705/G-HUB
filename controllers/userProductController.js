const userProductController={}
const brandSchema = require('../models/brandSchema')
const categorySchema=require('../models/category')
const productSchema=require('../models/product')
const User = require('../models/User')
const userSchema=require('../models/User')
const reviewSchema=require('../models/reviewSchema')

//displaying products
userProductController.productDisplay=async(req,res)=>{
    try
    {
        const userId=req.session.userId
        const productsPerPage=10
        const page=parseInt(req.query.page) ||1
        const limit=5
        const offset=(page-1)*limit
        const totalProducts=await productSchema.countDocuments()
        const totalPages=Math.ceil(totalProducts /productsPerPage ) 
        const user=await User.findById(userId)
        const categories=await categorySchema.find()
        const products=await productSchema.find().populate('category').skip(offset).limit(limit)
        res.render('home',{categories,products,userId,totalPages,currentPage:page})
    }
    catch(error)
    {
        console.log("Error occured during displaying all proudcts",error)
        res.render('error')
    }
}



//product details
userProductController.productDetails = async (req, res) => {
    try {
        const userId=req.session.userId
        const user=await userSchema.findById(userId)
        const productId = req.query.productId;
        const brand=await brandSchema.find()
        const reviews=await reviewSchema.find({product:productId}).populate('user')
        // console.log("id founded", productid);
        const product = await productSchema.findById(productId).populate('category').populate('brand');
        const categories = await categorySchema.find();
        if (product && product.isPublished) {
            res.render('product-details', { product, categories ,productId,userId,user,brand,reviews});
            // console.log(categories);

        } else {
            res.redirect('/home');
        }
    } catch (error) {
        console.error("Error occurred during displaying product details", error);
        res.render('error');
    }
}

userProductController.writeReviews=async(req,res)=>{
    try {
        console.log("in reviewsceham")
        const {userId,rating,reviewText,productId}=req.body
        console.log("IN REQ.body",req.body)
        const newReview=new reviewSchema({
            user:userId,
            rating:rating,
            reviewText:reviewText,
            product:productId
        })
        await newReview.save()
        console.log('SAVED')
        return res.json({status:"success",message:"Review Saved Successfully"})
        
        

    } catch (error) {
        console.log("error occured while saving reviews",error)
        return res.status(500).json({ status: "error", message: "Internal server error" });

    }
}


  



module.exports=userProductController

