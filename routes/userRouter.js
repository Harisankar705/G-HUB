const express=require('express')
const userRouter=express.Router()
// const adminCategoriesController=require('../controllers/adminCategoriesController')
const UserController=require('../controllers/adminUserController')
const loginController=require('../controllers/loginController')
const signupController=require('../controllers/signupController')
const userProductController=require('../controllers/userProductController')
const userCartController=require('../controllers/userCartContoller')
const userProfileController=require('../controllers/userProfileController')
const userOrderController=require('../controllers/userOrderController')
const couponController=require('..//controllers/couponController')
const userAuth=require('../middleware/userAuth')
const isBlocked=require("../middleware/isBlocked")
const coupon = require('../models/couponSchema')
const userWishlistController=require('../controllers/userWishlistController')
const walletController=require('../controllers/walletController')
const offerManagementController=require('../controllers/offerManagementController')
const offer = require('../models/offerSchema')






userRouter.get('/',loginController.showHome)
userRouter.get('/login',loginController.loginForm)
userRouter.post('/login',userAuth,isBlocked,loginController.loginHandle)
userRouter.get('/home',isBlocked,loginController.homeRender)
userRouter.get('/product-details',isBlocked,userProductController.productDetails)

//userprofile
// userRouter.get('/userprofile/:id',userProductController.userProfile)
userRouter.get('/signup',signupController.signupForm)
userRouter.post('/signup',signupController.signuphandle)
userRouter.get('/signup-otp',signupController.showOtp)
userRouter.post('/signup-otp',signupController.OTPverification)
userRouter.post('/resendOTP',signupController.resendOTP)

// userRouter.get('/:name',isBlocked,userProductController.categoryWise)
//displaying products category wise

//cart 
userRouter.get('/cart', isBlocked, userCartController.showCart);
userRouter.post('/addtocart/:id',isBlocked,userCartController.addProductToCart)
userRouter.get('/cart/itemtoremove',isBlocked, userCartController.removeProduct);
userRouter.post('/cart/updatequantity/:productId',isBlocked,userCartController.updateQuantity )
userRouter.post('/cart/updatquantity/:productId',isBlocked,userCartController.updateQuantity )
userRouter.post('/cart/decreasequantity/:productId',isBlocked,userCartController.decreaseQuantity)
userRouter.post('/logout',loginController.logOut)
//userprofile settings
userRouter.get('/userprofile/:userId',isBlocked,userProfileController.showProfile)
userRouter.post('/editprofile/:userId', isBlocked,userProfileController.editProfile);
userRouter.get('/editpassword/:userId',isBlocked,userProfileController.showPassword)
userRouter.post('/savepassword/:userId',userProfileController.changePassword)
userRouter.get('/address/:userId',userProfileController.displayAddress)
    userRouter.get('/addaddress/:userId',userProfileController.addAddress)
    userRouter.post('/saveaddress/:userId',userProfileController.manageAddAddress)
    userRouter.get('/editaddress/:id', userProfileController.showEditAddress);
    userRouter.post("/saveeditaddress/:id", userProfileController.manageEditAddress)
    userRouter.post("/deleteaddress/:id",userProfileController.deleteaddress)
    userRouter.get('/order-details/:id',userProfileController.orderDetails)


//checkout
userRouter.get('/checkout',userCartController.showcheckOut)

//orders
userRouter.post('/order-placed',userOrderController.placeOrder)
userRouter.get('/initiate-return/:id',userOrderController.returnOrder)
// userRouter.get('/order-details',userOrderController.orderDetails)
userRouter.get('/userorders',userOrderController.showOrders)
userRouter.get('/cancel-order/:id',userOrderController.cancelOrder)
userRouter.post('/payment-verification',userOrderController.verifyPayment)

//apply coupon
userRouter.post('/applycoupon',couponController.applyCoupon)


//wishlist
userRouter.get('/wishlist',userWishlistController.displayWishlist)
userRouter.post('/addtowishlist/:id',userWishlistController.addToWishlist)
userRouter.get('/removefromwishlist',userWishlistController.removeProduct)

//referandearn
userRouter.get('/referandearn/:userId',offerManagementController.referAndEarn)

//waller
userRouter.get('/userWallet',walletController.displayWallet)
module.exports=userRouter

