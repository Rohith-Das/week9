const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const Brand = require('../model/brandModel');
const Product = require('../model/productModel');
const bcrypt = require('bcrypt');
const { query } = require('express');
const multer = require('../middleware/multer');


const adminLogin = async (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        res.send(error.message);
    }
}
const adminDash = async (req, res) => {
    try {
        res.render('adminDashboard');
    } catch (error) {
        res.send(error.message);
    }
}
const verifyAdmin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });

        if (userData) {
            if (userData.is_blocked) {
                return res.render('adminLogin', { message: "Your account is blocked. Please contact support." });
            }

            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (userData.is_admin === 1) {
                    req.session.admin_id = userData._id; 
                    res.redirect("/admin/dashboard");
                } else {
                    res.render('adminLogin', { message: "Email and password are incorrect" });
                }
            } else {
                res.render('adminLogin', { message: "Email and password are incorrect" });
            }
        } else {
            res.render('adminLogin', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        res.send(error.message);
    }
};



const allCustomers = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of items per page
        const skip = (page - 1) * limit;

        const query = {
            is_admin: 0,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ]
        };

        const totalUsers = await User.countDocuments(search ? query : { is_admin: 0 });
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(search ? query : { is_admin: 0 })
            .skip(skip)
            .limit(limit);

        res.render('customer3', { 
            users, 
            search, 
            currentPage: page, 
            totalPages,
            totalUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};







// Block User
const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: true });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};

// Unblock User
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { is_blocked: false });
        res.redirect('/admin/dashboard/allcustomer');
    } catch (error) {
        res.send(error.message);
    }
};

const loadCategory = async (req, res) => {
    try {
        const search = req.query.search || '';
        const query = {
            $or: [
                { categoryName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };
        const categories = await Category.find(query);
        res.render('categoryList', { categories, search });
    } catch (error) {
        res.send(error.message);
    }
};

const addCategory = async (req, res) => {
    try {
        const { categoryName, description, status } = req.body;

        // Check if the category already exists
        const existingCategory = await Category.findOne({ categoryName });

        if (existingCategory) {
            // Fetch all categories from the database
            const categories = await Category.find();
            // Render the view with an error message and existing categories
            return res.render('categoryList', { 
                categories, 
                message: 'Category already exists' 
            });
        }

        // Create and save new category
        const newCategory = new Category({ categoryName, description, status });
        await newCategory.save();

        // Redirect to the category list page
        res.redirect('/admin/dashboard/categoryList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const editCategory = async (req, res) => {
    try {
        const { id, categoryName, description, status } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(id, { categoryName, description, status }, { new: true });

        if (updatedCategory) {
            res.redirect('/admin/dashboard/categoryList');
        } else {
            res.redirect('/admin/dashboard/categoryList', { message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleCategoryStatus = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const category = await Category.findById(categoryId);

        if (category) {
            category.is_delete = !category.is_delete;
            await category.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const listCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: false });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

const unlistCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findByIdAndUpdate(categoryId, { is_delete: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};




const loadBrand = async (req, res) => {
    try {
        const search = req.query.search || ''; // Search query, if any
        const page = parseInt(req.query.page) || 1; // Current page, default to 1
        const limit = 5; // Limit of items per page
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        // Build the query
        const query = search 
            ? { name: { $regex: search, $options: 'i' } } // Case-insensitive search by brand name
            : {}; // No filter if no search term

        // Get total number of brands
        const totalBrands = await Brand.countDocuments(query);

        // Fetch brands with pagination and search
        const brands = await Brand.find(query)
            .skip(skip)
            .limit(limit);

        // Calculate total pages
        const totalPages = Math.ceil(totalBrands / limit);

        // Render the 'brands' template with pagination data
        res.render('brands', {
            brands,
            currentPage: page,
            totalPages,
            totalBrands,
            search
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};





const addBrand = async (req, res) => {
    try {
        const { brandName, description, status } = req.body;

        // Check if the brand already exists
        const existingBrand = await Brand.findOne({ brandName });

        if (existingBrand) {
            // Fetch all brands from the database
            const brands = await Brand.find();
            // Render the view with an error message and existing brands
            return res.render('brands', { 
                brands, 
                message: 'Brand already exists' 
            });
        }

        // Create and save new brand
        const newBrand = new Brand({ brandName, description, is_deleted: status === 'unlisted' });
        await newBrand.save();

        // Redirect to the brand list page
        res.redirect('/admin/dashboard/brandList');
    } catch (error) {
        res.status(500).send(error.message);
    }
};
const editBrand = async (req, res) => {
    try {
        const { id, brandName, description, status } = req.body;

        // Check for duplicate brand name
        const existingBrand = await Brand.findOne({ brandName, _id: { $ne: id } });

        if (existingBrand) {
            const brands = await Brand.find();
            return res.render('brands', { 
                brands, 
                message: 'Brand name already exists' 
            });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(id, { brandName, description, is_deleted: status === 'unlisted' }, { new: true });

        if (updatedBrand) {
            res.redirect('/admin/dashboard/brandList');
        } else {
            res.redirect('/admin/dashboard/brandList', { message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const toggleBrandStatus = async (req, res) => {
    try {
        const { brandId } = req.params;
        const brand = await Brand.findById(brandId);

        if (brand) {
            // Toggle the is_deleted status
            brand.is_deleted = !brand.is_deleted;
            await brand.save();

            res.json({ success: true, message: 'Brand status updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Brand not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Function to get active categories
const getActiveCategories = async () => {
    return await Category.find({ is_delete: false, status: 'active' });
};

// Function to get active brands
const getActiveBrands = async () => {
    return await Brand.find({ is_deleted: false });
};

const loadProducts = async (req, res) => {
    try {
      const categories = await Category.find();
      const products = await Product.find().populate('category').populate('brand'); // Adjust if needed
      const brands = await Brand.find(); // Fetch brands from the database
      res.render('product', { categories, products, brands }); // Pass brands to the view
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };

  
  const loadAddProduct = async (req, res) => {
    try {
        const categories = await getActiveCategories();
        const brands = await getActiveBrands();
        res.render('addProduct', { categories, brands });
    } catch (err) {
        console.error('Error fetching categories or brands:', err);
        res.status(500).send('Internal Server Error');
    }
};

const addProduct = async (req, res) => {
    try {
        // console.log('Request Body:', req.body);
        const {
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod
        } = req.body;

        const newProduct = new Product({
            productName,
            stockQuantity,
            category,
            price,
            stock,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            images: req.files.map(file => `/uploads/products/${file.filename}`), 
            imageUrl: req.files.length > 0 ? `/uploads/products/${req.files[0].filename}` : null
        });

        await newProduct.save();
        
        // Send a JSON response instead of redirecting
        res.json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};




const loadEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Fetch all active categories and brands
        const categories = await Category.find({ is_delete: false, status: 'active' });
        const brands = await Brand.find({ is_deleted: false });

        res.render('editProduct', {
            product,
            categories,
            brands
        });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(500).send('Server Error');
    }
};


// Edit an existing product
const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            productName,
            stockQuantity,
            category,
            price,
            description,
            brand,
            thickness,
            shape,
            waterResistance,
            warrantyPeriod,
            status,
            'strapDetails.width': strapWidth,
            existingImages // Capture existing images from the request body
        } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update product details
        product.productName = productName;
        product.stockQuantity = parseInt(stockQuantity);
        product.category = category;
        product.price = parseFloat(price);
        product.description = description;
        product.brand = brand;
        product.thickness = parseFloat(thickness);
        product.shape = shape;
        product.waterResistance = waterResistance;
        product.warrantyPeriod = warrantyPeriod;
        product.isListed = status === 'Listed';
        product.strapDetails = { ...product.strapDetails, width: parseFloat(strapWidth) };

        // Handle images
        const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
        const filteredExistingImages = existingImages.filter(image => image && image.trim()); // Remove empty strings
        const finalImages = filteredExistingImages.concat(newImages); // Merge existing and new images

        product.images = finalImages;
        product.imageUrl = finalImages[0];

        await product.save();

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the product' });
    }
};

const toggleProductStatus = async (req, res) => {
    try {
      const productId = req.params.productId;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.is_deleted = !product.is_deleted;
      await product.save();
  
      return res.json({ success: true, is_deleted: product.is_deleted });
    } catch (error) {
      console.error('Error toggling product status:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };




module.exports = {
    adminLogin,
    adminDash,
    
    verifyAdmin,
    allCustomers,
  
    blockUser,
    unblockUser,
    loadCategory,
    addCategory,
    editCategory ,
    toggleCategoryStatus,
    listCategory,
    unlistCategory,
  
    loadBrand,
    editBrand,
    addBrand,
    toggleBrandStatus,
    loadProducts,
    loadAddProduct,
    addProduct,
    loadEditProduct,
    editProduct,
    toggleProductStatus
   
   

   
    
};
