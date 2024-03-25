const userProductController={}
const brandSchema = require('../models/brandSchema')
const categorySchema=require('../models/category')
const productSchema=require('../models/product')
const User = require('../models/User')
const userSchema=require('../models/User')

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
        // console.log("id founded", productid);
        const product = await productSchema.findById(productId).populate('category').populate('brand');
        const categories = await categorySchema.find();
        if (product && product.isPublished) {
            res.render('product-details', { product, categories ,productId,userId,user,brand});
            // console.log(categories);

        } else {
            res.redirect('/home');
        }
    } catch (error) {
        console.error("Error occurred during displaying product details", error);
        res.render('error');
    }
}



  



module.exports=userProductController

