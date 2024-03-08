const User = require('../models/User');
const Product = require('../models/product');
const Category = require('../models/category');
const bcrypt = require('bcryptjs');
const productSchema=require('../models/product')
const categorySchema=require('../models/category')
const session = require('express-session');


const loginController = {};
loginController.showHome=async(req,res)=>{
    const productsPerPage=10
    const page=parseInt(req.query.page)||1
    const limit=8
    const searchQuery=req.query.search
    const sortCategory=req.query.category||''
    let query = {};

    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query = {
            $or: [
                { name: { $regex: searchRegex } }
            ]
        };
    }
    if(sortCategory)
    {
        query.category=sortCategory
    }
    const offset=(page-1)*limit
    const totalProducts=await productSchema.countDocuments(query);
    const totalPages=Math.ceil(totalProducts/productsPerPage)
    const userId=req.session.userId || ''
    
    const user=await User.findById(userId)
    res.render('homepage',{user})
}
//loginf form user
loginController.loginForm = (req, res) => {
    if (req.session.userLogin) {
        res.redirect('/home');
    } else {
        res.render('login', { message: '' });
    }
};
//post login
loginController.loginHandle = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // User not found
            const errorMessage = "User not found";
            return res.redirect('/login?error=' + encodeURIComponent(errorMessage));
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            // Invalid password
            const errorMessage = "Invalid password. Passwords do not match.";
            return res.redirect('/login?error=' + encodeURIComponent(errorMessage));
        }

        req.session.userId = user._id;
        req.session.userLogin = true;
        
        res.redirect("/home");
    } catch (error) {
        console.error("Error in loginHandle:", error);
        const errorMessage = "Internal server error";
        res.redirect('/login?error=' + encodeURIComponent(errorMessage));
    }
};




// Update the homeRender function in your controller
loginController.homeRender = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productsPerPage = 10;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const searchQuery = req.query.search || '';
        const sortCategory = req.query.sortCategory || '';

        let query = {};

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query = {
                $or: [
                    { name: { $regex: searchRegex } }
                ]
            };
        }

        if (sortCategory) {
            query.category = sortCategory;
        }

        console.log("Search Query:", searchQuery);
        console.log("Category Sorting:", sortCategory);
        console.log("MongoDB Query:", query);

        const offset = (page - 1) * limit;
        const totalProducts = await productSchema.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / productsPerPage);
        const user = await User.findById(userId);
        const categories = await categorySchema.find();
        const products = await productSchema.find(query).populate('category').skip(offset).limit(limit);
        

        if (req.session.userLogin && userId) {
            res.render('home', { categories, products, userId, totalPages, currentPage: page, user, searchQuery, sortCategory });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error occurred during rendering', error.message);
        res.status(500).send('Internal Server Error');
    }
};



//userlogout
loginController.logOut = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                res.status(500).send('Internal Server Error');
            } else {
                console.log('Logged out successfully');
                res.redirect('/login');
            }
        });
    } catch (error) {
        console.error('Error occurred during logout:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = loginController;
