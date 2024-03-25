    const brandSchema = require("../models/brandSchema")

    const brandController={}


    brandController.showBrands=async(req,res)=>{
        try {
            const page=parseInt(req.query.page) ||1
            const limit=5
            const offset=(page-1)*limit
            const searchQuery=req.query.search||''
            const query={}
            if(req.query.isPublished)
            {
                query.isPublished=req.query.isPublished==="true"
            }
            if (searchQuery) {
                query.name = { $regex: new RegExp(searchQuery, 'i') };
            }
            const brand=await brandSchema.find(query).skip(offset).limit(limit).exec()
            const totalBrands=await brandSchema.countDocuments()
            res.render('adminBrands',{brand:brand,searchQuery:searchQuery,isPublished:req.query.isPublished,currentPage:page,totalPages:Math.ceil(totalBrands/limit)})
            
        } catch (error) {
            console.log("Error occured during showBrands",error)
            res.render('error')
        }
    }

    brandController.addBrandPage=async(req,res)=>{
        try {
            const brand=await brandSchema.find()
            res.render('addBrand',{brand})
        } catch (error) {
            console.log("Error occured during addingBrand",error)
            res.render('error')
        }
    }

    brandController.handleData=async(req,res)=>{
        try {
            const{name}=req.body
            console.log("RE",name)
            if(!name || name.trim==='')
            {
                return res.json({status:"error",message:"Brand name needed"})
            }
            const exisitingBrand=await brandSchema.findOne({
                name: { $regex: new RegExp('^' + name + '$', 'i') }
            })
            if(exisitingBrand)
            {
                return res.json({status:"error",message:"Brand already exists"})
            }
            const newBrand=await brandSchema({name})
            await newBrand.save()
            return res.json({status:"success",message:"Brand added"})
        } catch (error) {
            console.log("error occured during handledata",error)
            res.render('error')
        }
    }

    brandController.showEditBrand=async(req,res)=>{
        try {
            const id=req.params.id
            const brand=await brandSchema.findById(id)
            res.render('editBrand',{brand})
        } catch (error) {
            console.log("Error occured during showing edit brand",error)
            res.render('error')
        }
    }

    brandController.handleEditedBrand=async(req,res)=>{
        console.log("IN HANDLEEIDTBRAND")
        const {name}=req.body
        const id=req.params.id
        if (!name || /^\s*$/.test(name)) {
            return res.json({ status: 'error', message: "Category name is required" });
        }
        if (name.trim() !== name) {
            return res.json({ status: "error", message: "Category name must not start or end with a space" });
        }
        const existingBrand = await brandSchema.findOne({
            $or: [
                { name: name }, // Case-sensitive check for the exact name
                { name: { $regex: new RegExp('^' + name + '$', 'i') } }, // Case-insensitive check
            ]
        });

        if (existingBrand) {
            return res.json({ status: 'error', message: 'Category Already Exists' });
        }
        try {
        await brandSchema.findByIdAndUpdate(id,{name:name},{new:true})
        return res.json({status:"success",message:"Brand edited successfully"})

        } catch (error) {
        console.log("Error occured during handleEditBrand",error) 
        res.render('error')
        }
    }

    brandController.manageToggle=async(req,res)=>{
        try {
            const id=req.params.id
            console.log("In toogle",id)

            
            const brand=await brandSchema.findById(id)
        console.log("brand",brand)
            if(brand)
            {
                brand.isPublished=!brand.isPublished
                await brand.save()
                res.redirect('/admin-brand')
            }
            else
            {
                console.log("Error occured during toogling brand",error)
            }
        } catch (error) {
            console.error("Error occured during toogling brand", error);
            res.render('error')
            // res.status(500).json({status:"error",message:error.message})  
        }
    }

    module.exports=brandController