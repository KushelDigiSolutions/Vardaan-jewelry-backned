import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Get Cart
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// Add / Update item in Cart
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant, variantDetails } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Determine variant-specific inventory limit
    let availableInventory = product.inventory;
    if (variantDetails && product.variants && product.variants.length > 0) {
      // Full variant (karat/metalColor/size) match
      const match = product.variants.find(v => 
        v.size === variantDetails.size &&
        v.karat === variantDetails.karat &&
        v.metalColor === variantDetails.metalColor &&
        (v.metalType || '') === (variantDetails.metalType || '') &&
        (v.grossWeight || '') === (variantDetails.grossWeight || '') &&
        (v.netWeight || '') === (variantDetails.netWeight || '')
      );
      if (match) {
        availableInventory = match.inventory;
      }
    } else if (variant && product.sizes && product.sizes.length > 0) {
      // Size-only variant — check per-size inventory if set
      const sizeMatch = product.sizes.find(s => s.size === variant);
      if (sizeMatch && sizeMatch.inventory > 0) {
        availableInventory = sizeMatch.inventory;
      }
    }

    if (availableInventory < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available for this variant' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && 
      item.variant === variant
    );

    if (itemIndex > -1) {
      // Check total combined stock
      const totalNewQuantity = cart.items[itemIndex].quantity + Number(quantity);
      if (availableInventory < totalNewQuantity) {
        return res.status(400).json({ success: false, message: `Cannot add more. Limit is ${availableInventory}` });
      }
      cart.items[itemIndex].quantity = totalNewQuantity;
    } else {
      cart.items.push({ 
        product: productId, 
        quantity: Number(quantity),
        variant,
        variantDetails
      });
    }

    await cart.save();
    const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};

// Remove / Decrement item in Cart
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId, variant, removeAll = false } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && 
      item.variant === variant
    );

    if (itemIndex > -1) {
      if (removeAll || cart.items[itemIndex].quantity <= 1) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity -= 1;
      }
      await cart.save();
    }

    const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};

// Clear Cart
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.status(200).json({ success: true, message: 'Cart cleared successfully', data: cart });
  } catch (error) {
    next(error);
  }
};

// Update item quantity in Cart (Absolute update)
export const updateCartItem = async (req, res, next) => {
  try {
    const { productId, variant, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && 
      item.variant === variant
    );

    if (itemIndex > -1) {
      let availableInventory = product.inventory;
      const vDetails = cart.items[itemIndex].variantDetails;
      const itemVariant = cart.items[itemIndex].variant;
      if (vDetails && product.variants && product.variants.length > 0) {
        const match = product.variants.find(v => 
          v.size === vDetails.size &&
          v.karat === vDetails.karat &&
          v.metalColor === vDetails.metalColor &&
          (v.metalType || '') === (vDetails.metalType || '') &&
          (v.grossWeight || '') === (vDetails.grossWeight || '') &&
          (v.netWeight || '') === (vDetails.netWeight || '')
        );
        if (match) {
          availableInventory = match.inventory;
        }
      } else if (itemVariant && product.sizes && product.sizes.length > 0) {
        // Size-only variant — check per-size inventory if set
        const sizeMatch = product.sizes.find(s => s.size === itemVariant);
        if (sizeMatch && sizeMatch.inventory > 0) {
          availableInventory = sizeMatch.inventory;
        }
      }

      if (availableInventory < quantity) {
        return res.status(400).json({ success: false, message: `Only ${availableInventory} units in stock for this variant` });
      }

      cart.items[itemIndex].quantity = Number(quantity);
      await cart.save();
    } else {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};

