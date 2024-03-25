const isBlocked = require('../middleware/isBlocked')
const User=require('../models/User')
const adminUserController={}
//displaying all users
adminUserController.displayUsers=async(req,res)=>{
    try
    {
    const usersPerPage=2
    const page=parseInt(req.query.page)||1
    const limit=2
    const searchQuery=req.query.search||''
    const statusFilter=req.query.status||''
    let query={}
    if(searchQuery)
    {
        const  searchRegex=new RegExp(searchQuery,'i')
        query={
            $or:[{email:{$regex:searchRegex}}]
        }
    }
    if(statusFilter)
    {
        query.isBlocked=statusFilter==='blocked'
    }
    console.log("SearchQuery",query)
    const offset=(page-1)*limit
    const totalUsers=await User.countDocuments(query)
    const totalPages=Math.ceil(totalUsers/usersPerPage)
    const users=await User.find(query).limit(limit).skip(offset)
    res.render('customers',{users,totalPages,currentPage:page,searchQuery,statusFilter})
    
}
catch(error)
{
    console.log("Error in adminuser",error)
    res.render('error')
}
}

//blocking users
adminUserController.blockuser=async(req,res)=>{
    try {
        const userId = req.params.id;
        console.log("userid",   userId);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        user.isBlocked = !user.isBlocked || false;
        await user.save();

        res.redirect('/admin/user-management');
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.render('error')
    }
}
//unblocking users
adminUserController.unblockuser=async(req,res)=>{
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        user.isBlocked = false;
        await user.save();

        res.redirect('/admin/user-management');
    } catch (error) {
        console.error('Error setting isBlocked to false:', error);
        res.render('error')
    }
}

module.exports=adminUserController