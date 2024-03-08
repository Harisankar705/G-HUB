const productSchema = require('../models/product');
const userSchema = require('../models/User');
const mongoose = require('mongoose');
const categorySchema = require('../models/category');
const cartSchema = require('../models/cartSchema');
const User=require('../models/User')
const cart = require('../models/cartSchema');
const productController = require('./adminProductController');
const userCartController = {};
const couponSchema=require('../models/couponSchema');
const coupon = require('../models/couponSchema');

// Define a function to calculate the total price of items in the cart
const calculateTotalPrice = (items) => {
    const totalPrice = items.reduce((total, item) => {
        if (item.productId.totalQuantity > 0) {
            return total + item.productId.price * item.quantity;
        }
        return total;
    }, 0);

    return totalPrice.toFixed(2);
};
//displaying cart
userCartController.showCart= async (req, res) => {
    try {
      let userId = req.session.userId
      const user=await userSchema.findById(userId)
      console.log("usercar",userId);
      let cart = await cartSchema.find({ userId: userId }).populate('products.productId')
      const categories=await categorySchema.find()
      let products
      if (!cart || cart.length === 0) {
        // If user has no cart, create a new cart
        let newCart = new cartSchema({ userId: userId, products: [] });
        await newCart.save();
        cart = [newCart]; // Wrap the new cart in an array for consistency
      }
  
      // Now, check if products are available
      if (cart[0].products && cart[0].products.length > 0) {
        products = cart[0].products;
  
        // Calculate the total cart value
        cart[0].total = products.reduce((total, product) => {
          return total + product.total;
        }, 0);
  
        totalCart = cart[0].total;
      } else {
        products = [];
        totalCart = 0;
      }
      req.session.isCheckout = true
      res.render('cart', { products, totalCart,categories,user })
    } catch (error) {
      console.log("An error occured while displaying cart page", error.message);
      res.render('error')
    }
  }





// Adding product to cart
userCartController.addProductToCart = async (req, res) => {
  try {
      console.log("In add to cart");
      const userId = req.session.userId;
      console.log("userid", userId);
      const productId = req.params.id;
      console.log("prod", productId);
      const quantity = req.body.quantityValue ? parseInt(req.body.quantityValue, 10) : 1;
      if (isNaN(quantity) || !isFinite(quantity)) {
        return res.status(400).send("Invalid quantity");
    }
      if (!userId) {
          return res.redirect("/login");
      }

      try {
          let userCart = await cartSchema.findOne({ userId });
          console.log("usercart");

          if (!userCart) {
              userCart = new cartSchema({ userId, products: [] });
          }

          // Retrieve the product from the database
          const product = await productSchema.findById(productId);

          // Log the product details for debugging
          console.log("Product details:", product);

          // Check if the requested quantity is available in the stock
          if (product.stock < quantity) {
              return res.status(400).send("Requested product is not available in stock");
          }

          // Calculate total for the product
          const productTotal = product.price * quantity;

          // Log the calculated total for debugging
          console.log("Calculated product total:", productTotal);

          // Add product to the userCart
          const productIndex = userCart.products.findIndex(
              (product) => product.productId.toString() === productId
          );

          if (productIndex === -1) {
              userCart.products.push({ productId, quantity, total: productTotal });
          } else {
              userCart.products[productIndex].quantity += quantity;
              userCart.products[productIndex].total += productTotal;
          }

          // Reduce the stock of the product
          product.stock -= quantity;

          // Save the updated user's cart and product in the database
          await userCart.save();
          await product.save();

          res.redirect("back");

      } catch (error) {
          console.error("Error while adding product to cart:", error);
          res.status(500).send("Error while adding product to cart");
      }
  } catch (error) {
      console.error("Error in addProductToCart:", error);
      res.status(500).send("Error in addProductToCart");
  }
};





    












// Remove product from cart
userCartController.removeProduct = async (req, res) => {
    console.log("In productremoval")
    const userId = req.session.userId;
    console.log('useridtoremove', userId);
    const productToRemove = req.query.productId;
    console.log("product to remove", productToRemove);

    try {
        const userCart = await cartSchema.findOne({ userId: userId });

        if (!userCart) {
            return res.json({ status: "error", message: "Cart not found" });
        }

        const removedProduct = userCart.products.find(product => product.productId.toString() === productToRemove);

        if (!removedProduct) {
            return res.json({ status: "error", message: "Product to remove not found" });
        }

        const product = await productSchema.findById(productToRemove);

        if (product) {
            // Increase the stock with the quantity of the removed product
            product.stock += removedProduct.quantity;
            await product.save();
        }

        // Remove the product from the cart
        userCart.products = userCart.products.filter(product => product.productId.toString() !== productToRemove);
        await userCart.save();

        res.json({ status: "success", message: "Product removed from cart" });

    } catch (error) {
        console.log("Error occurred during remove product from cart", error);
        res.json({ status: 'failed', message: "Error occurred during item removal" });
    }
};


// Update quantity

userCartController.updateQuantity = async (req, res) => {
    console.log("IN updatequantity",req.body)
    const userId = req.session.userId;
    const productId = req.params.productId;
    const newQuantity = parseInt(req.body.quantity, 10);
    


    console.log('userId:', userId);
    console.log('productId:', productId);
    console.log('newQuantity:', newQuantity);
    // console.log("price",price)

    try {
        const userCart = await cartSchema.findOne({ userId });
        if (userCart) {
            const productInCart = userCart.products.find(product => product.productId.toString() === productId);
            if (productInCart) {
                const oldQuantity = productInCart.quantity;
                const product = await productSchema.findById(productId);

                const quantityDifference = newQuantity - oldQuantity;

                if (isNaN(quantityDifference) || !isFinite(quantityDifference)) {
                    return res.json({ status: "error", message: "Invalid quantity" });
                }

                if (quantityDifference > 0 && product.stock - quantityDifference < 0) {
                    // Display SweetAlert when trying to increase quantity for out-of-stock product
                    return res.json({ status: "error", message: "Not enough stock" });
                }

                // Update the stock based on the quantity difference
                product.stock -= quantityDifference;

                // Ensure the stock doesn't go below zero
                if (product.stock < 0) {
                    product.stock = 0;
                }

                productInCart.quantity = newQuantity;
                await product.save();
                await userCart.save();

                res.json({ status: "success", message: "Quantity updated" });
            } else {
                res.json({ status: "error", message: "Product not found in cart" });
            }
        }

    } catch (error) {
        console.error("Error occurred during update Quantity: ", error);
        res.json({ status: "danger", message: "Error occurred during quantity update" });
    }
};
//decreasing quantity
userCartController.decreaseQuantity = async (req, res) => {
  const userId = req.session.userId;
  const productId = req.params.productId;
  const newQuantity = parseInt(req.body.quantity, 10);

  try {
      const userCart = await cartSchema.findOne({ userId });

      if (userCart) {
          console.log('userCart:', userCart);

          const productInCart = userCart.products.find(product => product.productId.toString() === productId);

          if (productInCart) {
              const oldQuantity = productInCart.quantity;
              const product = await productSchema.findById(productId);

              console.log('productId:', productId);
              console.log('oldQuantity:', oldQuantity);

              const quantityDifference = oldQuantity - newQuantity;

              if (isNaN(quantityDifference) || !isFinite(quantityDifference) || quantityDifference < 0) {
                  return res.json({ status: "error", message: "Invalid quantity" });
              }

              // Increase the stock based on the quantity difference
              product.stock += quantityDifference;

              productInCart.quantity = newQuantity;

              await product.save();
              await userCart.save();

              res.json({ status: "success", message: "Quantity updated" });
          } else {
              res.json({ status: "error", message: "Product not found in cart" });
          }
      } else {
          res.json({ status: "error", message: "User cart not found" });
      }
  } catch (error) {
      console.error("Error occurred during decrease Quantity: ", error);
      res.json({ status: "danger", message: "Error occurred during quantity decrease" });
  }
};








//showing checkout
userCartController.showcheckOut = async (req, res) => {
    try {
        console.log("IN show checkout");
        const userId = req.session.userId;
        console.log("userid in checkout", userId);
        const user = await User.findById(userId);
        console.log("user in checkout", user);
        const cart = await cartSchema.findOne({ userId: userId }).populate('products.productId');
        console.log("cart in user", cart);
        const coupons=await couponSchema.find()

        const products = cart.products;

        cart.total = products.reduce((total, product) => {
            const productTotal = parseFloat(product.productId.price) * product.quantity;
            console.log("Product Total", productTotal);

            if (!isNaN(productTotal) && isFinite(productTotal)) {
                return total + productTotal;
            } else {
                console.log("Invalid product total for product", product.productId.name);
                return total;
            }
        }, 0);

        const grandTotal = cart.total;
        console.log("Grand Total", grandTotal);
        res.render('checkout', { user, products:cart.products, grandTotal,coupons});
    } catch (error) {
        res.render('error')
    }
  };


  
  
  


module.exports = userCartController;
