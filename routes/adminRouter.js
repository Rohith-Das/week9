const express = require('express');
const adminRouter = express.Router();
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv').config();
const adminController = require('../controller/adminController');
const adminAuth = require("../middleware/adminAuth");
const multer = require('../middleware/multer');

adminRouter.use(bodyParser.json());
adminRouter.use(bodyParser.urlencoded({ extended: true }));


adminRouter.post('/', adminController.verifyAdmin);
adminRouter.get('/login',adminController.adminLogin)

adminRouter.get('/dashboard', adminController.adminDash);
// Category routes
adminRouter.get('/dashboard/categoryList', adminController.loadCategory);
adminRouter.post('/dashboard/categoryList', adminController.addCategory);
adminRouter.post('/dashboard/editCategory', adminController.editCategory);
adminRouter.post('/dashboard/loadCategory/:categoryId', adminController.loadCategory);
adminRouter.post('/dashboard/toggleCategoryStatus/:categoryId', adminController.toggleCategoryStatus);

adminRouter.get('/dashboard/allcustomer',  adminController.allCustomers);

adminRouter.post('/dashboard/block/:userId',  adminController.blockUser);
adminRouter.post('/dashboard/unblock/:userId',  adminController.unblockUser);

// Brand routes
adminRouter.get('/dashboard/brandList', adminController.loadBrand);
adminRouter.post('/dashboard/addBrand', adminController.addBrand);
adminRouter.post('/dashboard/editBrand', adminController.editBrand);
adminRouter.post('/dashboard/toggleBrandStatus/:brandId', adminController.toggleBrandStatus);


// Product routes
adminRouter.get('/dashboard/productList',adminController.loadProducts);
adminRouter.get('/dashboard/addProduct', adminController.loadAddProduct);
// adminRouter.js

adminRouter.post('/dashboard/addProduct', multer.array('images', 3), adminController.addProduct);

adminRouter.get('/dashboard/editProduct/:id', adminController.loadEditProduct);
adminRouter.post('/dashboard/editProduct/:id', multer.array('images', 3), adminController.editProduct);
adminRouter.post('/dashboard/toggleProductStatus/:productId', adminController.toggleProductStatus);








// adminRouter.get('*', (req, res) => {
//     res.redirect('/admin');
// });

module.exports = adminRouter;
