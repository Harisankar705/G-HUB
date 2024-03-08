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

adminRouter.get('/admin',adminController.showAdminLogin)
adminRouter.post('/admin',adminController.handleAdminLogin)
adminRouter.get('/adminPanel',adminController.showAdminPanel)
adminRouter.post('/admin/logout',adminController.logout)
//user management
adminRouter.get('/admin/user-management',adminUserController.displayUsers)
adminRouter.get('/admin/user-management/block/:id',adminUserController.blockuser);
adminRouter.get('/admin/user-management/unblock/:id',adminUserController.unblockuser);
//prroduct
adminRouter.get('/admin/products',adminProductController.showProduct)
adminRouter.get('/admin/add',adminProductController.addProduct)
adminRouter.post('/admin/add', adminProductController.upload.fields([{ name: 'mainimage', maxCount: 1 }, { name: 'additionalImage', maxCount: 5 }]), adminProductController.handleProduct);
adminRouter.get('/admin/products/edit/:id',adminProductController.showEditProduct)
adminRouter.post('/admin/products/edit/:id',adminProductController.upload.fields([{ name: 'mainimage', maxCount: 1 }, { name: 'additionalImage', maxCount: 5 }]), adminProductController.editProduct)
adminRouter.get('/admin/products/restrict/:id',adminProductController.toggleManage)


//category
adminRouter.get('/admin/category',adminCategoriesController.showData)
adminRouter.get('/admin/category/add',adminCategoriesController.addCategory)
adminRouter.post('/admin/category/add',adminCategoriesController.handleCategory)
adminRouter.get('/admin/category/edit/:id',adminCategoriesController.ShowCategoryEdit)
adminRouter.post('/admin/category/edit/:id',adminCategoriesController.handleEditCategory)
adminRouter.get('/admin/category/restrict/:id',adminCategoriesController.manageToggle)


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

module.exports=adminRouter
    