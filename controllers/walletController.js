const userSchema = require('../models/User')
const walletSchema = require('../models/walletSchema')
const walletController = {}

walletController.displayWallet = async (req, res) => {
  try {
    const userId = req.params.id
    const walletPerPage = 5
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const offset = (page - 1) * limit
    const totalWallet = await walletSchema.countDocuments({ userId: userId })
    const totalPages = Math.ceil(totalWallet / walletPerPage)
    console.log("USERID", userId)
    const user = await userSchema.findById(userId)
    let userWallet = await walletSchema.findOne({ userId: userId }).limit(limit).skip(offset)
    if (!userWallet) {
      userWallet = new walletSchema({ userId: userId })
      await userWallet.save()
    }
    res.render('userWallet', { userWallet, user, totalPages, currentPage: page })
  } catch (error) {
    console.log("Error in displayWallet : ", error);
    res.render('error')
  }
}

module.exports = walletController