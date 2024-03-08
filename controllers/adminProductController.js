const productController={}
const productSchema=require('../models/product')
const categorySchema=require('../models/category')
const mongoose=require('mongoose')
const path=require('path')
const multer=require('multer')
productController.showProduct = async (req, res) => {
    try {
        const productsPerPage = 10;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;  // Corrected to match productsPerPage
        const offset = (page - 1) * limit;
        let query = {};

        let searchQuery = '';  // Initialize searchQuery

        // Check if there is a search query
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query = {
                $or: [
                    { name: { $regex: searchRegex } },
                    { description: { $regex: searchRegex } }
                ]
            };

            searchQuery = req.query.search;  // Assign the search query to searchQuery
        }

        // Include the filter for isPublished
        if (req.query.isPublished) {
            query.isPublished = req.query.isPublished === 'true'; // Assuming the query parameter is a string representation of boolean
        }

        const totalProducts = await productSchema.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        const products = await productSchema.find(query).populate('category').skip(offset).limit(limit);

        res.render('adminProduct', {
            products,
            totalPages,
            currentPage: page,
            searchQuery,  // Pass the searchQuery to the template
            isPublished: req.query.isPublished, // Pass the isPublished value to the template
        });
    } catch (error) {
        console.log("Error occurred while loading products", error);
        res.status(500).send("Internal Server Error"); // Send an error response to the client
    }
}








//add product page
productController.addProduct=async(req,res)=>{
    try
    {
        const categories=await categorySchema.find()
        res.render('addProduct',{alert:null,categories  })
    }
    catch(error)
    {
        console.log("Error occured while adding product",errorr)
    }
}
const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, "public/product-images")
    },
    filename: (req, file, cb) => {
        console.log("Req body",req.body)
            cb(null, Date.now() + path.extname(file.originalname))
    }
})

productController.upload=multer({
    storage:storage,
    limits:{fileSize:5*1024*1024}
})

//adding products to db



productController.handleProduct = async (req, res) => {
    try {
        const { name, category, description, price,stock } = req.body;
        

        const categoryId = new mongoose.Types.ObjectId(category);
        const mainImagePath = req.files['mainimage'][0].path;
        const additionalImagePaths = req.files['additionalImage'].map(file => file.path);

        // Create the new product
        const newProduct = new productSchema({
            name,
            category: categoryId,
            description,
            stock,
            price,
            mainimage: mainImagePath,
            additionalimages: additionalImagePaths,
            isPublished: true,
        });

        // Save the new product to the database
        const savedProduct = await newProduct.save();

        // Update the corresponding category's products array
        await categorySchema.findByIdAndUpdate(categoryId, {
            $push: { products: savedProduct._id }
        });

        console.log("Product created Successfully");
        res.json({status:'success',message:"Product created"})
    } catch (error) {
        console.error(error.message);
        res.json({status:'error',message:"Failed to create product"})
        res.redirect('/admin/products')
    }
};



//showing edit product
productController.showEditProduct=async(req,res)=>{
    try
    {
        const id=req.params.id
        const products=await productSchema.findById(id).populate('category')
        const category=await categorySchema.find()
        res.render('editProduct',{products,category})
    }
    catch(error)
    {
        console.log("Error occured while showing editProduct",error)
    }
}
//saving edit product
productController.editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, category, description, price ,stock} = req.body;

        // Validate required fields
        if (!name || !category || !description || !price || !stock) {
            return res.status(400).send('All fields are required.');
        }

        // Validate name length
        if (name.length > 255) {
            return res.status(400).json('Product name should be less than 255 characters.');
        }

        // Validate description length
        if (description.length > 1000) {
            return res.status(400).json('Product description should be less than 1000 characters.');
        }

        // Validate price is a non-negative number
        if (isNaN(price) || parseFloat(price) < 0) {
            return res.status(400).json('Price must be a non-negative number.');
        }

        // Validate category
        const categoryName = await categorySchema.findOne({ name: category });

        if (!categoryName || !categoryName._id) {
            return res.status(400).send('Invalid category.');
        }

        const categoryID = categoryName._id;

        const updateFields = {
            name,
            description,
            price,
            stock,
            category: categoryID
        };

        // if (req.files['mainimage'][0]) {
        //     updateFields.mainimage = req.files['mainimage'][0].path;
        // }

        const updateProduct = await productSchema.findByIdAndUpdate(productId, { $set: updateFields });

        if (updateProduct) {
            res.redirect('/admin/products');
        } else {
            console.error('Failed to update product:', productId);
            res.render('error');
        }
    } catch (error) {
        console.error('An error occurred while editing product', error);
        res.render('error');
    }
};
//publishing/unpublishing product
productController.toggleManage = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productSchema.findById(id);

        if (product) {
            // Toggle the isPublished property
            product.isPublished = !product.isPublished;

            // If the product is not published, mark it as deleted
            if (!product.isPublished) {
                product.deleted = true;
            }

            await product.save();

            // Check if all products are unpublished
            const allProductsUnpublished = await productSchema.find({ isPublished: true }).countDocuments() === 0;

            if (allProductsUnpublished) {
                res.send('All products unpublished');
            } else {
                res.redirect('/admin/products');
            }
        } else {
            console.log("Product not found ");
            res.render('error');
        }

    } catch (error) {
        console.log("Error occurred while product toggling", error);
        res.render('error');
    }
};





module.exports = productController;        