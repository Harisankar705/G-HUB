const nodemailer = require('nodemailer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const walletSchema=require('../models/walletSchema')
const otpGenerator = require('generate-otp');
const wallet = require('../models/walletSchema');
const signupController = {};
//sending otp
const sendOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "harisankar705@gmail.com",
            pass: "abyh lsvn crui rhdd"
        }
    });

    const mailOptions = {
        from: "harisankar705@gmail.com",
            to: email,
            subject: "OTP verification",
        text: `Your OTP for email verification is ${otp}`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("OTP sent", info);
    } catch (error) {
        console.log("Error sending in OTP", error);
        res.render('error')
    }
}
//signup
signupController.signupForm = async (req, res) => {
    if (req.session.userLogin) {
        res.redirect('/login');
    } else {
        const referralLink=req.query.ref
        if(referralLink)
        {
            req.session.referralLink=referralLink
            req.session.save()
        }
        res.render('signup', { message: '' });
        req.session.signupUser = true;
        req.session.save();
        console.log("signupUser", req.session.signupUser);
        console.log("signupuser", req.session);
    }
}
//validatiog signup
//validatiog signup
signupController.signuphandle = async (req, res) => {
    const { username, email, password } = req.body;
    const referralLink=req.session.referralLink


    let generatedOTP;  // Define generatedOTP outside the if block

    // Check if a referral code is provided
    if (referralLink) {
        const referrer = await User.findOne({ referralCode:referralLink });

        // If referrer found, save referrer ID in session
        if (referrer ) {
            console.log("Referrer found", referrer);
            generatedOTP = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
            req.session.signupData = {
                username,
                email,
                password,
                generatedOTP,
                timeStamp: Date.now(),
                referrer: referrer._id
               
            };
            await referrer.save()
        } else {
            console.log("No referrer found with the given referral code");
            // Handle accordingly (e.g., show an error message)
            return res.render('signup', { message: "Invalid referral code" });
        }
    } else {
        // If no referral code, proceed without a referrer
        generatedOTP = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
        req.session.signupData = {
            username,
            email,
            password,
            generatedOTP,
            timeStamp: Date.now()
        };
    }

    console.log("OTP sent to your mail", req.session.signupData.email);
    try {
        await sendOTP(email, req.session.signupData.generatedOTP);  // Fix here
        res.redirect(`/signup-otp?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
    } catch (err) {
        console.log("Error happened during OTP", err);
        res.render('error')
        // res.redirect('/signup');
    }
}


// Showing OTP
signupController.showOtp = (req, res) => {
    console.log("signup User", req.session);
    const email = req.query.email;
    const username = req.query.username;
    if (req.session.signupUser) {
        res.render('signup-otp', { message: "", email, username });
    } else {
        res.redirect('/');
    }
}

// Verifying OTP
signupController.OTPverification = async (req, res) => {
    const enteredOTP = req.body.enteredOTP;
    const signupData = req.session.signupData;
    const email = req.query.email;
    const username = req.query.username;

    if (!signupData) {
        return res.status(400).json({ success: false, message: "Signup Data is missing" });
    }

    const OTPtime = 50 * 1000;

    if (Date.now() - signupData.timeStamp > OTPtime) {
        return res.status(400).json({ success: false, message: "OTP expired, Please Request A New One" });
    }

    if (enteredOTP === signupData.generatedOTP) {
        const saltround = 10;
        const hashedpassword = await bcrypt.hash(signupData.password, saltround);
        const referralCode = generateCode(); // Hash the password before saving

        const newUser = new User({
            username: signupData.username,
            email: signupData.email,
            password: hashedpassword,
            referralCode: referralCode,
            referrer: signupData.referrer  // Fix here
        });

        try {
            const existingUserWithReferralCode = await User.findOne({ referralCode:referralCode });
            if (existingUserWithReferralCode) {
                // If the referral code is not unique, regenerate it and retry
                const newReferralCode = generateCode();
                newUser.referralCode = newReferralCode;
            }
            let storedUser = await newUser.save();
            
            // Fix here: Change 'referrer' to 'signupData.referrer'
            // if (signupData.referrer) {
            //     const referralRewardAmount = 100;
            //     const referrerWallet = await walletSchema.findOne({ userId: signupData.referrer });
            //     if (!referrerWallet) {
            //         referrerWallet = new walletSchema({ userId: storedUser._id });
            //         await referrerWallet.save();
            //     }
            //     referrerWallet.amount += referralRewardAmount;
            //     if(referralRewardAmount)
            //     {
            //         referrerWallet.transactionHistory.push({
            //             type:"Credit-Earned by refering",
            //             amount: referralRewardAmount,
            //             date:new Date()
            //         })
            //     }
                
            //     await referrerWallet.save();
            // }

            // const signupRewardAmount = signupData.referrer ? 50 : 0; // 50 if there is a referrer, 0 otherwise
            // let newUserWallet = await walletSchema.findOne({ userId: storedUser._id });
            
            // if (!newUserWallet) {
            //     newUserWallet = new walletSchema({ userId: storedUser._id });
                
            // }
            // newUserWallet.amount += signupRewardAmount;
            // if(signupRewardAmount)
            // {
            //     newUserWallet.transactionHistory.push({
            //         type:"Credit-Earned by referall",
            //         amount:signupRewardAmount,
            //         date:new Date()
            //     })
            // }
           
            // await newUserWallet.save();
            
            req.session.userLogin = true;
            req.session.userId = storedUser._id;
            delete req.session.signupData;
            res.status(200).json({ success: true, message: "SignUp Successful" });
            req.session.save();
        } catch (err) {
            console.log("Error saving the user", err);
/* The line `res.status(500).json({ success: false, message: "Internal Server Error" });` is used to
send a response back to the client with a status code of 500 (Internal Server Error) and a JSON
object containing information about the error. This response is typically sent when there is an
unexpected error on the server side that prevents the request from being processed successfully. The
`success` property is set to `false` to indicate that the operation was not successful, and the
`message` property provides a description of the error that occurred. */
            res.render('error')
            // res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    } else {
        res.status(400).json({ success: false, message: "Incorrect OTP, Try again!!" });
    }
}

function generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 5;
    let randomCode = '';
  
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomCode += characters.charAt(randomIndex);
    }
  
    return randomCode;
  }

  
// Resend OTP
signupController.resendOTP = async (req, res) => {
    if (!req.session.signupData) {
        return res.json({ success: false, message: "Signup data not found in session" });
    }

    const signupData = req.session.signupData;
    const resendCooldown = 15 * 1000;

    if (Date.now() - signupData.timeStamp < resendCooldown) {
        return res.json({ success: false, message: "Time for resend not met" });
    }

    delete req.session.signupData.generatedOTP;
    const newOTP = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    req.session.signupData.generatedOTP = newOTP;
    req.session.signupData.timeStamp = Date.now();
   
    try {
        await sendOTP(signupData.email, newOTP);
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error("Error during resend", err);
        res.render('error')
        // res.json({ success: false, message: "OTP sending failed" });
    }
}

module.exports = signupController;
