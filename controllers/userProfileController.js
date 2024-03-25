const User=require('../models/User')
const categorySchema=require('../models/category')
const cartSchema=require('../models/cartSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')
const orderSchema = require('../models/orderSchema')
const userProfileController={}
const productSchema=require('../models/product')
const { retryPayment } = require('./userOrderController')


userProfileController.showProfile=async(req,res)=>{
    try{
        const userId=req.session.userId
        const user=await User.findById(userId)
        

        const userIdObject=new mongoose.Types.ObjectId(userId)
        const categories=await categorySchema.find()
        const cart = await cartSchema.findOne({ userId:userIdObject}).populate('products.productId')
        if(!user){
            res.redirect('/login')
            console.log("user not found");
        }
        else{
            res.render('userProfile',{userId,categories,user})
        }
    } catch (error) {
        console.log("Error occurred during showing profile",error)
        res.render('error')
    }
}
// userProfileController.showEditProfile=async(req,res)=>{
//     try {
//         const userId=req.session.userId
//         const user=await User.findById(userId)
//         if (!user) {
//             return res.send ('No such user is present in the database') 
//         } 
//         res.render('editProfile',{user})
//     } catch (error) {
//         console.log("Error occured while showing editprofile")
//     }
// }
userProfileController.editProfile = async (req, res) => {
    try {
        const userId=req.session.userId
        const { username, email, phonenumber } = req.body;
        console.log("Req.body",req.body);

        const userData = await User.findById(userId);

        if (!userData) {
            return res.json({ status: "error", message: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { username:username, email: email, phonenumber: phonenumber } },
            { new: true }
        );

        if (!updatedUser) {
            return res.json({ status: "error", message: "Failed to update user data" });
        }

        res.json({ status: "success", message: "Edited Successfully", user: updatedUser });
        console.log("Edited succesfully");
    } catch (error) {
        console.log("Error occurred while editing user data:", error);
        res.render('error')
       
    }
}


userProfileController.showPassword=async(req,res)=>{
    try {
        const userId=req.session.userId
        const user=await User.findById(userId)
        res.render('editPassword',{user})
    } catch (error) {
console.log("Error occured while loading editPassword",error)
res.render('error')
    }
   

}
userProfileController.changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        console.log("?///",userId);
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        console.log("Change password", req.body);
        console.log("reb",req.body);

        const userData = await User.findById(userId);
        const userPassword = userData.password;
        if (!userPassword) {
            return res.json({ status: 'error', message: "User password not found" });
        }
        console.log("userPassword", userPassword);
        console.log("Currentpass", currentPassword);

        // Checking current password and user password
        const compareCurrentPassword = await bcrypt.compare(currentPassword, userPassword);
        console.log("compare", compareCurrentPassword);

        // Comparing new password with the current password
        const compareNewPassword = await bcrypt.compare(newPassword, userPassword);

        if (currentPassword === "" || newPassword === "") {
            return res.json({ status: 'error', message: "Password should not be blank" });
        } else if (newPassword !== confirmNewPassword) {
            return res.json({ status: 'error', message: "New password and confirm password should match" });
        } else if (compareNewPassword) {
            return res.json({ status: 'error', message: "Old and new password shouldn't be the same" });
        } else {
            // Hash the new password
            const saltRound = 10;
            const hashedNew = await bcrypt.hash(newPassword, saltRound);

            // Update the user's password in userData before saving
            userData.password = hashedNew;

            // Save the updated user data
            await userData.save();

            res.json({ status: "success", message: "Password changed" });
        }
    } catch (error) {
        console.log("Error occurred while editing password", error);
        res.render('error')
        // res.json({ status: "error", message: "Internal server error" });
    }
};


userProfileController.displayAddress=async(req,res)=>{
    try {
        const userId=req.session.userId
    const user=await User.findById(userId)
    res.render('userAddress',{user})
    } catch (error) {
        console.log("An error occurred while displaying address")
        res.render('error')
    }
    

}

userProfileController.addAddress=async(req,res)=>{
    try {
        const userId=req.session.userId
        console.log("In addaddress");
        const user=await User.findById(userId)
        res.render('addAddress',{user})
    } catch (error) {
        console.log("Error occured during add address"); 
        res.render('error')  
        // res.status(500).send("Internal Server Error");
 
    }
}
//adding address
userProfileController.manageAddAddress = async (req, res) => {
    try {
        console.log("In manageAddAddress");

        const { houseaddress, state, district, city, pincode,phonenumber } = req.body;
        console.log("BOODY", req.body);
        const userId = req.session.userId;
        console.log("USERS", userId);

        // Check if required fields are empty
        if (!houseaddress || !state || !district || !city || !pincode ||!phonenumber) {
            return res.json({ status: "error", message: "All fields are required" });
        }
        if(phonenumber.toString().length!==10){
            return res.json({status:"error",message:"Phone number must be 10 digits"})
        }
        if(pincode.toString().length!==6)
        {
            return res.json({status:"error",message:"Pincode must be 6 digits"})
        }

        // Find the user by ID
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ status: "error", message: "User not found" });
        }

        const userAddress = user.address;
        console.log("USERaddress", userAddress);

        // Check if the maximum limit of addresses is reached
        if (userAddress.length >=4) {
            return res.json({ status: "error", message: "Maximum limit of addresses reached" });
        }

        // Check if the address already exists for the current user
        const existingAddress = user.address.find((addr) => {
            return (
                addr.houseaddress === houseaddress &&
                addr.state === state &&
                addr.district === district &&
                addr.city === city &&
                addr.phonenumber===phonenumber &&
                addr.pincode.toString() === pincode.toString()
            );
        });

        // Check if the address already exists
        const existingAddressInDB = await User.findOne({
            'address': {
                $elemMatch: {
                    'houseaddress': houseaddress,
                    'state': state,
                    'district': district,
                    'city': city,
                    'pincode': pincode,
                    'phonenumber':phonenumber,
                }
            }
        });

        if (existingAddress || existingAddressInDB) {
            return res.json({ status: "error", message: "Address already exists" });
        }

        // Add the new address
        const newAddress = {
            houseaddress: houseaddress,
            state: state,
            district: district,
            pincode: pincode,
            city: city,
            phonenumber:phonenumber
        };

        // Add the new address to the user's list
        user.address.push(newAddress);

        // Save the updated user document
        await user.save();

        return res.json({ status: "success", message: "Address added successfully", newAddress });
    } catch (error) {
        console.log("Error occurred during adding address", error);
        res.render('error')
        // return res.json({ status: "error", message: "Internal server error" });
    }
};





userProfileController.showEditAddress=async(req,res)=>{
    try {
        const userId=req.session.userId
        console.log("IN showedit",userId);
        const addressId=req.params.id
        console.log("Address",addressId);
        const selectedAddressId = req.params.id;
        console.log("Selectedaddress",selectedAddressId)

        const user=await User.findById(userId)
        const address=user.address.find((address)=>address._id.toString()===addressId)
        if(!address)
        {
            return res.json({status:"error",message:"Address not found"})
        }
        else
        {
            res.render('editAddress',{user,address,selectedAddressId})
        }
        console.log("Addressssss",address);
    } catch (error) {
        console.log("An error occured while displaying edit address",error)
        res.render('error')

    }
}
userProfileController.manageEditAddress = async (req, res) => {
    try {
        const userId = req.session.userId
        const { addressId, houseaddress, street, state, city, pincode,phonenumber} = req.body
        const user = await User.findById(userId)
        const userAddress = user.address
  
        const address = user.address.find((address) => address._id.toString() === addressId);
        if (!address) {
           res.json({ status: 'error', message: 'Address not found , please try again' })
        }
  
        const matchingAddresses = userAddress.filter(
           (userAddr) =>
              userAddr.houseaddress === houseaddress &&
              userAddr.state === street &&
              userAddr.district === district &&
              userAddr.city === city &&
              userAddr.pincode.toString().trim() === pincode.toString().trim() &&
              userAddr.state === state &&
              userAddr.phonenumber===phonenumber &&
              userAddr._id.toString() !== addressId // Exclude the current address being edited
        );
  
        if (matchingAddresses.length > 0) {
           return res.json({ status: 'error', message: "Same address already exists" })
        } else {
           address.houseaddress = houseaddress
           address.street = street
           address.state = state
           address.city = city
           address.pincode = pincode,
           address.phonenumber=phonenumber
  
           await user.save();
  
           res.json({ status: 'success', message: 'Address edited successfully' })
        }
     } catch (error) {
        console.log("An error occured while submitting edit address", error.message);
        res.render('error')
     }
  }



//delete address
userProfileController.deleteaddress=async(req,res)=>{
    try {
        const userId=req.session.userId
        console.log("In delete address")
        console.log("userid",userId);
        const addressId=req.params.id
        console.log("addressId",addressId)
        const user=await User.findById(userId)
        console.log("user",user);

        const addressIndex=user.address.findIndex((address)=>address._id.toString()===addressId)
        if(!addressIndex)
        {
            return res.json({status:"success",message:"Address not found"})
        }

        user.address.splice(addressIndex,1)
        await user.save()
        res.json({status:"success",message:"Address deleted successfully"})
    } catch (error) {
        console.log("Error occured while deleting address")
        res.json({status:"error",message:"Address failed to delete "})
        res.render('error')
    }
}
//showing orderdetails
userProfileController.orderDetails = async (req, res) => {
    try {
        console.log("n orderdetails")
        const orderId = req.params.id;
        const userId=req.session.userId
        console.log("In orderid",orderId);
        const orderDetails = await orderSchema.findById(orderId)
            .populate('products.productId')
            .populate("userId");
        const user=await User.findById(userId)
        const product=await productSchema.find()
        res.render('orderDetails', { orderDetails,user,product});
    } catch (error) {
        console.log("Error occurred while showing order details", error);
        // Handle the error appropriately, e.g., send an error response
        res.render('error')
        // res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

module.exports=userProfileController