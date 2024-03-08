const productSchema=require('../models/product')
const userSchema=require('../models/User')
const mongoose=require('mongoose')
const wishlistSchema=require('../models/wishlistSchema')
const categorySchema=require('../models/category')
const cartSchema=require('../models/cartSchema')

const userWishlistController={}

userWishlistController.displayWishlist=async(req,res)=>{
    try {
        const userId=req.session.userId
        const user=await userSchema.findById(userId)
        const cart=await cartSchema.find({userId:userId}).populate('products.productId')
        if(!cart)
        {
            cart=new cartSchema({userId:userId})
            await cart.save()
        }
        // const cartCount=await cart.products.length  
        let wishlist = await wishlistSchema
        .findOne({ userId: userId })
        .populate({
          path: 'products.productId',
          populate: { path: 'category' } // This assumes that 'category' is a reference in your 'productId' model
        });
              const categories=await categorySchema.find()
        if(!wishlist)
        {
            wishlist=new wishlistSchema({userId:userId})
            await wishlist.save()
        }
        const products=wishlist.products
        res.render('wishlist',{products,categories,user})
    } catch (error) {
        console.log("Error occured while loading wishlist",error)
    }
}  

userWishlistController.addToWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.params.id;

        const product = await productSchema.findById(productId).populate('category');

        if (!product) {
            return res.json({ status: "error", message: "Product not found" });
        }

        // Check if the category exists and is published
        if (!product.category || !product.category.isPublished) {
            return res.json({ status: "error", message: "The category of the product is not available" });
        }

        let wishlist = await wishlistSchema.findOne({ userId: userId });

        if (!wishlist) {
            wishlist = new wishlistSchema({ userId: userId });
            await wishlist.save();
        }

        let productAlreadyExists;

        if (wishlist.products.length > 0) {
            productAlreadyExists = wishlist.products.find((product) => product.productId._id.toString() === productId.toString());
        }

        if (productAlreadyExists) {
            return res.json({ status: "error", message: "Product already exists in the wishlist" });
        }

        const wishlistProduct = {
            productId: productId
        };

        wishlist.products.push(wishlistProduct);
        await wishlist.save();

        return res.json({ status: "success", message: "Product added to wishlist" });

    } catch (error) {
        console.log("Error occurred while adding product to wishlist", error);
        return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
};


userWishlistController.removeProduct = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productToRemove = req.query.productId

        // Fetch the wishlist document
        const wishlist = await wishlistSchema.findOne({ userId: userId }).populate('products.productId')
        const productIndexToRemove = wishlist.products.findIndex(product => product._id.toString() === productToRemove.toString()); //removing product based on the object id 

        // If the product is found, remove it
        if (productIndexToRemove !== -1) {
            wishlist.products.splice(productIndexToRemove, 1);
            // Save the updated wishlist
            await wishlist.save();
            res.json({ status: 'success', message: 'Product removed from wishlist successfully' });
        } else {
            res.json({ message: 'An error occured, we will solve this issue ASAP' });
        }

    } catch (error) {
        console.log("An error occured while removing from wishlist", error.message);
        res.render("error")
    }
}


module.exports=userWishlistController