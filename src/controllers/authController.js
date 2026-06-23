import User from '../models/User.js';
import Cart from '../models/Cart.js';
import { generateToken, generateOTP } from '../utils/helper.js';
import { sendEmail } from '../utils/email.js';
import { getWelcomeEmailTemplate, getForgotPasswordEmailTemplate } from '../utils/emailTemplates.js';

// Register User
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      mobile: mobile || '',
      otp,
      otpExpires,
      emailVerified: false
    });
    
    // Create an empty cart for the new user
    await Cart.create({ user: user._id, items: [] });

    // Send Welcome Email with Verification OTP
    const emailHtml = getWelcomeEmailTemplate(name, otp);
    await sendEmail({
      to: email,
      subject: 'Welcome to Vardaan - Verify Your Email Account',
      text: `Welcome to Vardaan! Your verification OTP is: ${otp}. This code is valid for 24 hours.`,
      html: emailHtml
    });

    // Also log to console for debugging/simulated flow fallback
    console.log(`\n=================== [MOCK SIGNUP OTP LOG] ===================`);
    console.log(`EMAIL: ${email}`);
    console.log(`OTP CODE: ${otp}`);
    console.log(`=============================================================\n`);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login User (Standard)
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      } 
    });
  } catch (error) {
    next(error);
  }
};

// Send OTP for Login
export const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins expiry
    await user.save();

    // Mock send OTP
    await sendEmail({
      to: email,
      subject: 'Your Vardaan Store OTP Verification Code',
      text: `Your OTP for login is: ${otp}. It is valid for 10 minutes.`,
      html: `<h3>Your OTP for login is: <b>${otp}</b></h3><p>It is valid for 10 minutes.</p>`
    });

    res.status(200).json({ success: true, message: 'OTP sent to your registered email' });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Clear OTP details
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    const resetToken = generateOTP(); // Use a simpler token for testing
    user.otp = resetToken;
    user.otpExpires = Date.now() + 30 * 60 * 1000; // 30 mins
    await user.save();

    const emailHtml = getForgotPasswordEmailTemplate(user.name, resetToken);
    await sendEmail({
      to: email,
      subject: 'Vardaan Store Password Recovery Code',
      text: `Use this recovery code to reset your password: ${resetToken}`,
      html: emailHtml
    });

    res.status(200).json({ success: true, message: 'Password recovery code sent to your email' });
  } catch (error) {
    next(error);
  }
};

// Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email, otp: code, otpExpires: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired recovery code' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    // Update password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
};

// Get User Profile
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Update User Profile / Addresses
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.mobile !== undefined) user.mobile = req.body.mobile;
    if (req.body.addresses !== undefined) user.addresses = req.body.addresses;

    await user.save();
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// Wishlist Manage: Toggle Product
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      user.wishlist.push(productId);
    } else {
      user.wishlist.splice(index, 1);
    }

    await user.save();
    res.status(200).json({ success: true, data: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// Verify Email API
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification OTP' });
    }

    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email address verified successfully' });
  } catch (error) {
    next(error);
  }
};

// Resend Email Verification OTP
export const resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email address is already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    const emailHtml = getWelcomeEmailTemplate(user.name, otp);
    await sendEmail({
      to: email,
      subject: 'Welcome to Vardaan - Verify Your Email Account',
      text: `Welcome to Vardaan! Your verification OTP is: ${otp}. This code is valid for 24 hours.`,
      html: emailHtml
    });

    console.log(`\n=================== [MOCK RESEND VERIFICATION OTP LOG] ===================`);
    console.log(`EMAIL: ${email}`);
    console.log(`OTP CODE: ${otp}`);
    console.log(`========================================================================\n`);

    res.status(200).json({ success: true, message: 'Verification OTP has been resent to your email.' });
  } catch (error) {
    next(error);
  }
};

// Login with Mobile (Simulates sending OTP)
export const loginMobile = async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    let user = await User.findOne({ mobile });
    if (!user) {
      // Create user profile for new guest login automatically
      user = await User.create({
        name: `User_${mobile.slice(-4)}`,
        email: `${mobile}@vardaanecom.com`,
        password: Math.random().toString(36).slice(-8),
        mobile,
        mobileVerified: false
      });
      await Cart.create({ user: user._id, items: [] });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // Log OTP for verification tracking
    console.log(`\n=================== [MOCK SMS OTP LOG] ===================`);
    console.log(`MOBILE: ${mobile}`);
    console.log(`OTP CODE: ${otp}`);
    console.log(`==========================================================\n`);

    res.status(200).json({ success: true, message: 'OTP verification code sent to mobile' });
  } catch (error) {
    next(error);
  }
};

// Verify Mobile OTP
export const verifyMobileOTP = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    const user = await User.findOne({ mobile, otp, otpExpires: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    user.mobileVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change Password API (Logged in)
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(oldPassword))) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Upload Avatar (Profile Image)
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const user = await User.findById(req.user._id);
    user.avatar = `/uploads/${req.files[0].filename}`;
    await user.save();

    res.status(200).json({ success: true, message: 'Avatar image uploaded successfully', avatar: user.avatar });
  } catch (error) {
    next(error);
  }
};

// Remove Avatar
export const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.avatar = '';
    await user.save();
    res.status(200).json({ success: true, message: 'Avatar removed successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete Account
export const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    await Cart.findOneAndDelete({ user: req.user._id });
    res.status(200).json({ success: true, message: 'User account removed successfully' });
  } catch (error) {
    next(error);
  }
};

// GET User Addresses
export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Add Address
export const addAddress = async (req, res, next) => {
  try {
    const { title, street, city, state, zipCode, country, mobile, isDefault } = req.body;
    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    const newAddress = {
      title: title || 'Home',
      street,
      city,
      state,
      zipCode,
      country,
      mobile: mobile || '',
      isDefault: isDefault || user.addresses.length === 0
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Update Address
export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, street, city, state, zipCode, country, mobile, isDefault } = req.body;
    const user = await User.findById(req.user._id);

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
      address.isDefault = true;
    }

    if (title) address.title = title;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;
    if (country) address.country = country;
    if (mobile !== undefined) address.mobile = mobile;

    await user.save();
    res.status(200).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Set Default Address
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    user.addresses.forEach(addr => { addr.isDefault = false; });
    address.isDefault = true;

    await user.save();
    res.status(200).json({ success: true, message: 'Default address updated successfully', data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Delete Address
export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    user.addresses.pull(id);
    await user.save();

    res.status(200).json({ success: true, message: 'Address removed successfully', data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// Wishlist Detail Lists Get
export const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.status(200).json({ success: true, data: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// Add to Wishlist
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Product added to wishlist', data: user.wishlist });
  } catch (error) {
    next(error);
  }
};

// Remove from Wishlist
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    user.wishlist.pull(productId);
    await user.save();

    res.status(200).json({ success: true, message: 'Product removed from wishlist', data: user.wishlist });
  } catch (error) {
    next(error);
  }
};

