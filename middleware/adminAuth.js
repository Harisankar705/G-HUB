const adminSchema=require('../models/adminSchema')
const express=require('express')
const bcrypt=require('bcryptjs')
const bodyParser = require('body-parser')
const app=express()
app.use(bodyParser.urlencoded({extended:false}))

const adminAuth=async(req,res,next)=>{
    try
    {
        const {email,password}=req.body
        const admin=await adminSchema.findOne({email})
        req.session.adminLogin=true
        next()

    }catch(error)
    {
        console.log("Error in adminauth middleware",error)
        res.render('error')

    }
}
module.exports=adminAuth
