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
const adminAuth=require('../middleware/adminAuth')
const userOrderController = require('../controllers/userOrderController')
const brandController=require('../controllers/brandController')

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
adminRouter.get('/admin-orders',adminOrderController.showOrders)
adminRouter.post('/admin-changeOrderStatus', adminOrderController.changeOrderStatus);

//coupons
adminRouter.get('/admincoupons',adminCouponController.showAdminCoupons)
adminRouter.get('/admincoupons/add',adminCouponController.displayAddCoupon)
adminRouter.post('/admincoupons/addcoupons',adminCouponController.addingCoupon)
adminRouter.put('/deletecoupons/:id',couponController.deleteCoupon)
adminRouter.get('/editcoupon/:id',couponController.showeditCoupon)
adminRouter.post('/saveEditedCoupon/:id',couponController.handleEditedCoupon)

//offermanagement
adminRouter.get('/offer-management',offerManagementController.showOffers)
adminRouter.get('/admin/addoffer',offerManagementController.displayAddOffer)
adminRouter.post('/admin/saveoffer',offerManagementController.manageaddOffer)
adminRouter.get("/offer-management/toggle/:offerId",offerManagementController.toogleListOffer)
adminRouter.get("/editOffer/:offerId",offerManagementController.showEditOffer)
adminRouter.get('/deleteOffer/:offerId',offerManagementController.deleteOffer)
adminRouter.post('/saveeditoffer/:offerId',offerManagementController.handleEditOffer)

//sales report
adminRouter.get('/dashboard/filter-sales',adminController.filterSales)
adminRouter.post('/dashboard/filter-by-date',adminController.filterByDate)
adminRouter.post('/dashboard/generate-report',adminController.generatePDF)
adminRouter.post('/dashboard/generate-excel-report',adminController.generateSalesExcel)
adminRouter.get('/sales',adminController.sales)
adminRouter.get('/bestSellingProducts',adminController.topSellingProducts)
adminRouter.get('/bestSellingCategory',adminController.topSellingCategory)
adminRouter.get('/bestSellingBrands',adminController.topSellingBrands)


adminRouter.get('/admin-brand',brandController.showBrands)
adminRouter.get('/add-brand',brandController.addBrandPage)
adminRouter.post('/save-brand',brandController.handleData)
adminRouter.get('/edit-brand/:id',brandController.showEditBrand)
adminRouter.put('/save-edit/:id',brandController.handleEditedBrand)
adminRouter.get('/toogle-status/:id',brandController.manageToggle)

//return
adminRouter.post('/allow-return/:orderId/:productId',adminOrderController.allowReturn)
adminRouter.post('/decline-return/:orderId/:productId',adminOrderController.declineReturn)

adminRouter.get('/admin-order-details/:orderId',adminOrderController.orderDetails)
module.exports=adminRouter
    