import User from '../models/User.js';

// Get customer profiles directory (Admin only)
export const getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

// Toggle customer activation status (Admin only)
export const toggleCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found' });
    }

    if (customer.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend admin accounts' });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer account has been ${customer.isActive ? 'activated' : 'suspended'}`,
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        isActive: customer.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update customer details (Admin only)
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const customer = await User.findById(id);
    if (!customer || customer.role === 'admin') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (name) customer.name = name;
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use by another customer' });
      }
      customer.email = email;
    }

    await customer.save();
    res.status(200).json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// Delete customer (Admin only)
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);

    if (!customer || customer.role === 'admin') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Customer profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};

