const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const User = require("../model/userModel");
const randomstring=require('randomstring')
const Product = require("../model/productModel");
const Address = require('../model/addressModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Cart=require('../model/cartModel')
const Order = require('../model/orderModel');


const loadHome = async (req, res) => {
  try {
    const user = req.session.user || req.user;
    const id = req.query.id;
    const userData = await User.findById(id);

    // Fetch only listed products
    const products = await Product.find({ is_deleted: false }).limit(10);

    res.render("home", { user, userData, products });
  } catch (error) {
    console.error('Error fetching products:', error); // More detailed error logging
    res.status(500).send(error.message);
  }
};

const loadLogin = (req, res) => {
    try {
        res.render("login");
    } catch (error) {
        res.send(error.message);
    }
};




const loadRegister = (req, res) => {
    try {
        res.render("register");
    } catch (error) {
        res.send(error.message);
    }
};

// const authenticateUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find the user by email
//     const user = await User.findOne({ email: email });

//     if (!user) {
//       return res.render('login', { message: "Invalid email or password" });
//     }

//     // Check if the account is blocked
//     if (user.is_blocked === 1) {
//       return res.render('login', { message: "Your account has been blocked" });
//     }

//     // Compare the password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.render('login', { message: "Invalid email or password" });
//     }

//     // Successful authentication, store user ID in session
//     req.session.user_id = user._id;
//     res.redirect(`/home?id=${user._id}`);
    
//   } catch (error) {
//     // Handle any other errors
//     console.error(error);
//     res.status(500).render('login', { message: "An error occurred. Please try again later." });
//   }
// };


const authenticateUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.render('login', { message: "Invalid email or password" });
    }

    // Check if the account is blocked
    if (user.is_blocked) {
      return res.render('login', { message: "Your account has been blocked" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('login', { message: "Invalid email or password" });
    }

    // Successful authentication, store user ID in session
    req.session.user_id = user._id;
    res.redirect(`/home?id=${user._id}`);
    
  } catch (error) {
    // Handle any other errors
    console.error(error);
    res.status(500).render('login', { message: "An error occurred. Please try again later." });
  }
};




const logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.send(err.message);
        }
        res.redirect('/home');
    });
};


const generateOTP = () => {
    return randomstring.generate({
      length: 6,
      charset: "numeric",
    });
  };
  
  const securePassword = async (password) => {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      return passwordHash;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  const sendOTPEmail = (email, otp) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
  
      text: `Your OTP for verification is: ${otp}`,

    };
  
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          console.log("Email sent: " + info.response);
          resolve(info.response);
        }
  });
  });
  };



let otpStore = {};

const insertUser = async (req, res) => {
  // console.log("insertUser called for email:", req.body.email);
  try {
    const { name, phone, email, password, confirmPassword } = req.body;

    const user = await User.findOne({ email: email });
    if (user) {
      return res.render("register", { message: "The email is already exists. Please login and continue" });
    } else {
      const spassword = await securePassword(password);

      const otp = generateOTP();
      otpStore[email] = {
        otp,
        userData: { name, phone, email, password: spassword },
      };
      console.log(otp), await sendOTPEmail(email, otp);

      res.redirect(`/verify-otp?email=${email}`);

    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadVerifyOtp = async (req, res) => {
  try {
    const { email } = req.query;
    if (!otpStore[email]) {
      res.status(400).send("No OTP found for this email");
      return;
    }

    res.render("otp", {
      email,
      message: "Enter the OTP sent to your email.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// const verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (otpStore[email] && otpStore[email].otp === otp) {
//       const userData = new User({
//         ...otpStore[email].userData,
       
//       });

//       const savedUser = await userData.save();
//       delete otpStore[email];

//       req.session.user = savedUser;
//       res.redirect(`/home?email=${email}`);

//     } else {
//       res.status(400).send("Invalid OTP");
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
// }
// };

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (otpStore[email] && otpStore[email].otp === otp) {
      const userData = new User({
        ...otpStore[email].userData,
       
      });

      const savedUser = await userData.save();
      delete otpStore[email];

      req.session.user = savedUser;
      
      // Send a success response with email data
      res.json({ success: true, email: email });
    } else {
      // Send an error response with a message
      res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


const resentOTP = async (req, res) => {
    try {
      const { email } = req.query;
      if (!otpStore[email]) {
        res.status(400).send("No OTP found for this email");
        return;
      }
  
      const newOTP = generateOTP();
      otpStore[email].otp = newOTP;
      await sendOTPEmail(email, newOTP);
      console.log(`Resent OTP for ${email}: ${newOTP}`);
  
      res.status(200).send("OTP resent successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to resend OTP.");
  }
  };

//   const loadShopPage = async (req, res) => {
//     try {
//         // Fetch user data
//         const userData = req.user || {}; // Adjust according to how you manage user data
//         const user = req.session.user || req.user;
//         // Fetch only listed products
//         const products = await Product.find({ is_deleted: false });

//         // Render the shop view and pass userData and products
//         res.render('shop', {user,userData, products });
//     } catch (error) {
//         console.error('Error loading shop page:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };


const loadShopPage = async (req, res) => {
  try {
    const userData = req.user || {};
    const user = req.session.user || req.user;

    // Set default filter values
    const defaultFilters = {
      minPrice: 0,
      maxPrice: 100000,
      sort: 'popularity'
    };

    // Merge default filters with query params
    const filters = { ...defaultFilters, ...req.query };

    const filter = { is_deleted: false };
    if (filters.brand) filter.brand = { $in: filters.brand.split(',') };
    if (filters.category) filter.category = { $in: filters.category.split(',') };
    if (filters.shape) filter.shape = { $in: filters.shape.split(',') };

    filter.price = {
      $gte: Number(filters.minPrice),
      $lte: Number(filters.maxPrice)
    };

    let sortOption = {};
    switch (filters.sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'name-asc':
        sortOption = { productName: 1 };
        break;
      case 'name-desc':
        sortOption = { productName: -1 };
        break;
      default:
        sortOption = { createdAt: -1 }; // Default sort by newest
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .populate('brand')
      .populate('category');

    const brands = await Brand.find();
    const categories = await Category.find();
    const shapes = [...new Set(await Product.distinct('shape'))];

    res.render('shop', {
      user,
      userData,
      products,
      brands,
      categories,
      shapes,
      currentFilters: filters
    });
  } catch (error) {
    console.error('Error loading shop page:', error);
    res.status(500).send('Internal Server Error');
  }
};


const getFilteredProducts = async (req, res) => {
  try {
    const { brand, category, minPrice, maxPrice, shape, sort } = req.query;

    const filter = { is_deleted: false };

    if (brand) filter.brand = { $in: brand.split(',') };
    if (category) filter.category = { $in: category.split(',') };
    if (shape) filter.shape = { $in: shape.split(',') };
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    switch (sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'name-asc':
        sortOption = { productName: 1 };
        break;
      case 'name-desc':
        sortOption = { productName: -1 };
        break;
      default:
        sortOption = { createdAt: -1 }; // Default sort by newest
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .populate('brand')
      .populate('category');

    res.json({ products });
  } catch (error) {
    console.error('Error fetching filtered products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getProductDetails = async (req, res) => {
  try {
    const user = req.session.user || req.user;
    const id = user ? user._id : null;
    const userData = id ? await User.findById(id) : {};
    
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const relatedProducts = await Product.find({
      _id: { $ne: productId } 
    }).limit(4); 
    const byBrand = await Product.find({
      brand: product.brand, 
      _id: { $ne: productId } 
    }).limit(4);

    res.render('singleProduct', { user, userData, product, relatedProducts, byBrand });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};


// address
// Render address list

const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
   

    if (!userId) {
      return res.redirect('/login');
    }

    const addresses = await Address.find({ user: userId });
    console.log('Addresses:', addresses); // Debug logging

    res.render('address', { addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error); // Improved error logging
    res.status(500).send('Server Error');
  }
};



const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;  // Retrieve user ID from session
    const newAddress = new Address({ ...req.body, user: userId });  // Create a new Address instance
    await newAddress.save();  // Save address to the database
    res.redirect('/address');  // Redirect to address page
  } catch (error) {
    console.error(error);  // Log error
    res.status(500).send('Server Error');  // Send error response
  }
};


const editAddress = async (req, res) => {
  try {
      const addressId = req.params.id;
      const updatedData = {
          fullName: req.body.fullName,
          addressLine1: req.body.addressLine1,
          addressLine2: req.body.addressLine2,
          city: req.body.city,
          state: req.body.state,
          postalCode: req.body.postalCode,
          country: req.body.country,
          phoneNumber: req.body.phoneNumber
      };

      const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

      if (updatedAddress) {
          res.status(200).json({ success: true, address: updatedAddress });
      } else {
          res.status(404).json({ success: false, message: 'Address not found' });
      }
  } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ success: false, message: 'Error updating address' });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);
    res.redirect('/address');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const loadProfile = async (req, res) => {
  try {
      if (!req.session.user_id) {
          return res.redirect('/login'); // Redirect to login if not authenticated
      }
      const user = await User.findById(req.session.user_id);
      if (!user) {
          return res.status(404).send('User not found');
      }
      res.render('profile', { user });
  } catch (error) {
      res.status(500).send(error.message);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
      const { name, email, phone, currentPassword, newPassword, confirmNewPassword } = req.body;
      const user = await User.findById(req.session.user_id);

      if (!user) {
          return res.status(404).send('User not found');
      }

      // Update user details
      user.name = name;
      user.email = email;
      user.phone = phone;

      if (newPassword) {
          // Check current password and new password match
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          if (!isMatch) {
              return res.status(400).send('Current password is incorrect');
          }
          if (newPassword !== confirmNewPassword) {
              return res.status(400).send('New passwords do not match');
          }
          user.password = await bcrypt.hash(newPassword, 10); // Hash new password before saving
      }

      await user.save();
      res.redirect('/profile');
  } catch (error) {
      res.status(500).send(error.message);
  }
};

// load cart

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.id;

    if (!userId) {
      return res.redirect('/login');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    if (product.stockQuantity <= 0) {
      return res.status(400).send('Product is out of stock');
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        return res.status(400).send('Cannot add more of this item - stock limit reached');
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    await cart.save();
    res.redirect('/cart');
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Error adding to cart');
  }
};

const getCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        
        if (!userId) {
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        res.render('cart', { cart });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Error fetching cart');
    }
};


const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user_id;

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = cart.items.find(item => item.productId._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    const product = item.productId;
    if (quantity > product.stockQuantity) {
      return res.status(400).json({ success: false, error: 'Quantity exceeds available stock' });
    }

    item.quantity = quantity;
    await cart.save();

    const updatedItemTotal = item.quantity * product.price;
    const updatedCartTotal = cart.items.reduce((total, cartItem) => total + cartItem.quantity * cartItem.productId.price, 0);

    res.json({
      success: true,
      updatedItemTotal,
      updatedCartTotal
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, error: 'Error updating cart' });
  }
}

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user_id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true } // This option returns the modified document after update
    ).populate('items.productId');

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const updatedCartTotal = cart.items.reduce((total, item) => total + item.quantity * item.productId.price, 0);

    res.json({ success: true, updatedCartTotal });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, error: 'Error removing from cart' });
  }
};





// fogot-password

const loadForgotPassword = async (req, res) => {
  res.render('forgot-password');
};

const handleForgotPassword = async (req, res) => {
  try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.render('forgot-password', { message: "No account with that email address exists." });
      }

      // The random bytes generated are converted into a string of hexadecimal (hex) format

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();

      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
          },
      });

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

      const mailOptions = {
          to: user.email,
          from: process.env.EMAIL_USER,
          subject: 'Password Reset',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                `${resetUrl}\n\n` +
                `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };

      await transporter.sendMail(mailOptions);
      res.render('forgot-password', { message: `An email has been sent to ${user.email} with further instructions.` });

  } catch (error) {
      console.error(error);
      res.status(500).render('forgot-password', { message: "An error occurred. Please try again later." });
  }
};

const loadResetPassword = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: Date.now() } });

  if (!user) {
      return res.render('forgot-password', { message: "Password reset token is invalid or has expired." });
  }

  res.render('reset-password', { token });
};

const handleResetPassword = async (req, res) => {
  try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
          return res.render('reset-password', { token, message: "Passwords do not match." });
      }

      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: Date.now() } });

      if (!user) {
          return res.render('forgot-password', { message: "Password reset token is invalid or has expired." });
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      res.redirect('/login');
  } catch (error) {
      console.error(error);
      res.status(500).render('reset-password', { token, message: "An error occurred. Please try again later." });
  }
};
// checkout page

const loadCheckout=async(req,res) =>{
  try {
    const userId=req.session.user_id;
    if(!userId){
      redirect("/login")
    }
    const addresses = await Address.find({ user: userId });
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    res.render('checkout',{addresses,cart })
    console.log('Addresses:', addresses);
  } catch (error) {
    
  }
}








module.exports = {
    loadHome,
    loadLogin,
    loadRegister,
    verifyOTP,
    loadVerifyOtp,
    insertUser,
    resentOTP,
    authenticateUser,
    logoutUser,
    loadProfile,
    loadShopPage ,
    getFilteredProducts,
     getProductDetails,
     loadAddressPage,
    //  loadAddAddressPage,
     addAddress,
    
     deleteAddress,
     editAddress,
     updateProfile,
     addToCart,
     getCart,
     updateCart,
     removeFromCart,
     loadCheckout,
     loadForgotPassword,
     handleForgotPassword,
     loadResetPassword,
     handleResetPassword,
  
    
    
};
