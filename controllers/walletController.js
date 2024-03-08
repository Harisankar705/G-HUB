const userSchema=require('../models/User')
const walletSchema=require('../models/walletSchema')
const walletController={}

walletController.displayWallet=async(req,res)=>{
    try {
        const userId=req.session.userId
        const user=await userSchema.findById(userId)
        let userWallet=await walletSchema.findOne({userId:userId})
        if(!userWallet)
        {
            userWallet=new walletSchema({userId:userId})
            await userWallet.save()
        }
        res.render('userWallet',{userWallet,user})
    } catch (error) {
        console.log("Error in displayWallet : ", error);
        res.render('error')
    }
}

module.exports=walletController