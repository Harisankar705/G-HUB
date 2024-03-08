    const adminCategoriesController={}
    const categorySchema=require('../models/category')
    const productSchema=require('../models/product')
    const mongoose=require('mongoose')

    //rendering the category page
adminCategoriesController.showData= async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = 5;
                const offset = (page - 1) * limit;
                const searchQuery = req.query.search || '';
                const query = {};
                if (req.query.isPublished) {
                    query.isPublished = req.query.isPublished === 'true'; // Assuming the query parameter is a string representation of boolean
                }
                if (searchQuery) {
                    query.name = { $regex: new RegExp(searchQuery, 'i') };
                }
                const categories = await categorySchema.find(query)
                    .skip(offset)
                    .limit(limit)
                    .exec();
    
                const totalCategories = await categorySchema.countDocuments(query).exec();
    
                res.render('adminCategory', {
                    categories: categories,
                    currentPage: page,
                    totalPages: Math.ceil(totalCategories / limit),
                    searchQuery: searchQuery,
                    isPublished: req.query.isPublished, // Pass the isPublished value to the template
                });
            } catch (err) {
                console.error("Error while showing category", err);
                res.status(500).send("Internal Server Error");
            }
        }
    

    //add category page
    //add category page
    adminCategoriesController.addCategory = async (req, res) => {
        try {
            console.log('Inidse')
            const categories = await categorySchema.find();
            res.render('addCategory', { categories });
        } catch (err) {
            console.log("Error while rendering addCategory page", err);
            // Handle the error or send an error response
            return res.status(500).send("Internal Server Error");
        }
    }


    //saving category
    adminCategoriesController.handleCategory = async (req, res) => {
        const { name } = req.body;
        console.log("INSIDE HANDLE CATEGORY");
    
        // Validation: Check if the name is not empty
        if (!name || name.trim() === "") {
            return res.json({ status: "error", message: "Category name is required" });
        }
    
        const minNameLength = 3;
        const maxNameLength = 50;
        if (name.length < minNameLength || name.length > maxNameLength) {
            return res.json({ status: "error", message: `Category name must be between ${minNameLength} and ${maxNameLength} characters` });
        }
    
        try {
            // Validation: Check if the category already exists (case-insensitive)
            const existingCategory = await categorySchema.findOne({
                name: { $regex: new RegExp('^' + name + '$', 'i') }
            });
    
            if (existingCategory) {
                return res.json({ status: "error", message: "Category already exists" });
            }
    
            const newCategory = new categorySchema({ name });
    
            await newCategory.save();
            return res.json({ status: "success", message: "Category saved" });
        } catch (error) {
            console.log("Error during saving category to db", error);
            return res.json({ status: "error", message: "Internal Server Error" });
        }
    };
    
    
    //getting categories for dropdown menu in add/edit product page
    adminCategoriesController.ShowCategoryEdit = async (req, res, next) => {
        try {
            const id = req.params.id;
            console.log("In editcategory");
            const category = await categorySchema.findById(id);
            res.render('editCategory', { category });
        } catch (error) {
            console.log("Error in Showing Category for Edit", error);
            next(error); // Pass the error to the next middleware or error handler
        }
    };
    

//saving the editcategory
   adminCategoriesController.handleEditCategory = async (req, res) => {
        console.log("In third edit")
        const { name } = req.body;
        const id = req.params.id;
        console.log(req.body);
        console.log(id);
    
        if (!name || /^\s*$/.test(name)) {
            return res.json({ status: 'error', message: "Category name is required" });
        }
        
        if (name.trim() !== name) {
            return res.json({ status: "error", message: "Category name must not start or end with a space" });
        }
        
        const minNameLength = 3;
        const maxNameLength = 50;
        
        if (name.length < minNameLength || name.length > maxNameLength) {
            return res.json({ status: "error", message: `Category name must be between ${minNameLength} and ${maxNameLength} characters` });
        }
        
    
        try {
            const existingCat = await categorySchema.findOne({
                $or: [
                    { name: name }, // Case-sensitive check for the exact name
                    { name: { $regex: new RegExp('^' + name + '$', 'i') } }, // Case-insensitive check
                ]
            });
    
            if (existingCat) {
                return res.json({ status: 'error', message: 'Category Already Exists' });
            }
    
            try {
                await categorySchema.findByIdAndUpdate(id, { name: name }, { new: true });
                return res.json({ status: 'success', message: 'Category Updated Successfully' });
            } catch (error) {
                console.log("An error occurred", error.message);
                return res.json({ status: 'error', message: 'An error occurred, please try again' });
            }
        } catch (error) {
            console.log("An error occurred", error.message);
            return res.json({ status: 'error', message: 'An error occurred, please try again' });
        }
    };
    
    
    
    
    
    


      
    //publish and unpublish category
    adminCategoriesController.manageToggle = async (req, res) => {
        try {
            const id = req.params.id;
            const category = await categorySchema.findById(id);
    
            if (category) {
                category.isPublished = !category.isPublished;
                await category.save();
                res.redirect('/admin/category');
            } else {
                res.status(404).send("Category not found error");
            }
        } catch (error) {
            console.log("An error occurred", error.message);
            res.render('error');
        }
    };
    

    module.exports=adminCategoriesController