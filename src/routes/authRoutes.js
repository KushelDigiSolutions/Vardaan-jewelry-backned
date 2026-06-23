import express from 'express';
import {
  registerUser,
  loginUser,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  toggleWishlist,
  
  // Phase 2 additions
  verifyEmail,
  resendVerificationOTP,
  loginMobile,
  import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';
  verifyMobileOTP,
  changePassword,
  uploadAvatar,
  removeAvatar,
  deleteAccount,
  getAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Basic authentication
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/otp-send', sendOTP);
router.post('/otp-verify', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

  router.put('/avatar', protect, upload.array('avatar', 1), uploadToCloudinary, uploadAvatar);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-otp', resendVerificationOTP);
router.post('/login-mobile', loginMobile);
router.post('/verify-mobile-otp', verifyMobileOTP);

// Profile detail updates
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put('/change-password', protect, changePassword);
router.delete('/delete-account', protect, deleteAccount);

// Avatar management
router.put('/avatar', protect, upload.array('avatar', 1), uploadAvatar);
router.delete('/avatar', protect, removeAvatar);

// Address Directory CRUD routes
router.route('/addresses')
  .get(protect, getAddresses)
  .post(protect, addAddress);

router.route('/addresses/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

router.put('/addresses/:id/default', protect, setDefaultAddress);

// Wishlist management
router.post('/wishlist/toggle', protect, toggleWishlist);
router.route('/wishlist')
  .get(protect, getWishlist);
router.post('/wishlist/add', protect, addToWishlist);
router.post('/wishlist/remove', protect, removeFromWishlist);

export default router;
