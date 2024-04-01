const express=require('express')
const adminRouter=express.Router()
const checkBlocked=require('../middleware/isBlocked')
const userAuth=require('../middleware/userAuth')
const adminUserController=require('../controllers/adminUserController')
const adminController = require('../controllers/adminController')
const adminProductController=require('../controllers/adminProductController')
const adminCategoriesController=require('../controllers/adminCategoriesController')
const adminOrderController=require('../controllers/adminOrderController')
const adminCouponController=require('../controllers/couponController')
const offerManagementController=require('../controllers/offerManagementController')
const offer = require('../models/offerSchema')
const couponController = require('../controllers/couponController')
const adminAuth = require('../middleware/adminAuth');
const userOrderController = require('../controllers/userOrderController')
const brandController=require('../controllers/brandController')
// adminRouter.use(adminAuth)
adminRouter.get('/admin',adminController.showAdminLogin)
adminRouter.post('/admin',adminController.handleAdminLogin)
adminRouter.get('/adminPanel',adminAuth,adminController.showAdminPanel)
adminRouter.post('/admin/logout',adminController.logout)
//user management
adminRouter.get('/admin/user-management',adminAuth,adminUserController.displayUsers)
adminRouter.get('/admin/user-management/block/:id',adminAuth,adminUserController.blockuser);
adminRouter.get('/admin/user-management/unblock/:id',adminAuth,adminUserController.unblockuser);
//prroduct
adminRouter.get('/admin/products',adminAuth,adminProductController.showProduct)
adminRouter.get('/admin/add',adminAuth,adminProductController.addProduct)
adminRouter.post('/admin/add', adminAuth,adminProductController.upload.fields([{ name: 'mainimage', maxCount: 1 }, { name: 'additionalImage', maxCount: 5 }]), adminProductController.handleProduct);
adminRouter.get('/admin/products/edit/:id',adminAuth,adminProductController.showEditProduct)
adminRouter.post('/admin/products/edit/:id',adminAuth,adminProductController.upload.fields([{ name: 'mainimage', maxCount: 1 }, { name: 'additionalImage', maxCount: 5 }]), adminProductController.editProduct)
adminRouter.get('/admin/products/restrict/:id',adminAuth,adminProductController.toggleManage)


//category
adminRouter.get('/admin/category',adminAuth,adminCategoriesController.showData)
adminRouter.get('/admin/category/add',adminAuth,adminCategoriesController.addCategory)
adminRouter.post('/admin/category/add',adminAuth,adminCategoriesController.handleCategory)
adminRouter.get('/admin/category/edit/:id',adminAuth,adminCategoriesController.ShowCategoryEdit)
adminRouter.post('/admin/category/edit/:id',adminAuth,adminCategoriesController.handleEditCategory)
adminRouter.get('/admin/category/restrict/:id',adminAuth,adminCategoriesController.manageToggle)


//adminorder 
adminRouter.get('/admin-orders',adminAuth,adminOrderController.showOrders)
adminRouter.post('/admin-changeOrderStatus', adminAuth,adminOrderController.changeOrderStatus);

//coupons
adminRouter.get('/admincoupons',adminAuth,adminCouponController.showAdminCoupons)
adminRouter.get('/admincoupons/add',adminAuth,adminCouponController.displayAddCoupon)
adminRouter.post('/admincoupons/addcoupons',adminAuth,adminCouponController.addingCoupon)
adminRouter.put('/deletecoupons/:id',adminAuth,couponController.deleteCoupon)
adminRouter.get('/editcoupon/:id',adminAuth,couponController.showeditCoupon)
adminRouter.post('/saveEditedCoupon/:id',adminAuth,couponController.handleEditedCoupon)

//offermanagement
adminRouter.get('/offer-management',adminAuth,offerManagementController.showOffers)
adminRouter.get('/admin/addoffer',adminAuth,offerManagementController.displayAddOffer)
adminRouter.post('/admin/saveoffer',adminAuth,offerManagementController.manageaddOffer)
adminRouter.get("/offer-management/toggle/:offerId",adminAuth,offerManagementController.toogleListOffer)
adminRouter.get("/editOffer/:offerId",adminAuth,offerManagementController.showEditOffer)
adminRouter.get('/deleteOffer/:offerId',adminAuth,offerManagementController.deleteOffer)
adminRouter.post('/saveeditoffer/:offerId',adminAuth,offerManagementController.handleEditOffer)

//sales report
adminRouter.get('/dashboard/filter-sales',adminAuth,adminController.filterSales)
adminRouter.post('/dashboard/filter-by-date',adminAuth,adminController.filterByDate)
adminRouter.post('/dashboard/generate-report',adminAuth,adminController.generatePDF)
adminRouter.post('/dashboard/generate-excel-report',adminAuth,adminController.generateSalesExcel)
adminRouter.get('/sales',adminAuth,adminController.sales)
adminRouter.get('/bestSellingProducts',adminAuth,adminController.topSellingProducts)
adminRouter.get('/bestSellingCategory',adminAuth,adminController.topSellingCategory)
adminRouter.get('/bestSellingBrands',adminAuth,adminController.topSellingBrands)


adminRouter.get('/admin-brand',adminAuth,brandController.showBrands)
adminRouter.get('/add-brand',adminAuth,brandController.addBrandPage)
adminRouter.post('/save-brand',adminAuth,brandController.handleData)
adminRouter.get('/edit-brand/:id',adminAuth,brandController.showEditBrand)
adminRouter.put('/save-edit/:id',adminAuth,brandController.handleEditedBrand)
adminRouter.get('/toogle-status/:id',adminAuth,brandController.manageToggle)

//return
adminRouter.post('/allow-return/:orderId/:productId',adminAuth,adminOrderController.allowReturn)
adminRouter.post('/decline-return/:orderId/:productId',adminAuth,adminOrderController.declineReturn)

adminRouter.get('/customer-care',adminAuth,adminController.customerComplaints)
adminRouter.get('/admin/view-complaint/:id',adminAuth,adminController.complaintDetails)
adminRouter.post('/admin/reply-to-complaint/:id',adminAuth,adminController.replyConcern)

adminRouter.get('/admin-order-details/:orderId',adminAuth,adminOrderController.orderDetails)
module.exports=adminRouter
    