import dns from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8', '1.1.1.1']);
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Transaction from '../models/Transaction.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom-suite');
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await Cart.deleteMany();
    await Transaction.deleteMany();
    await InventoryLog.deleteMany();
    await Notification.deleteMany();
    await Coupon.deleteMany();

    console.log('Database cleared.');

    // 1. Create Users
    const admin = await User.create({
      name: 'Vardaan Admin',
      email: 'admin@vardaanecom.com',
      password: 'admin123', // Will be hashed via pre-save middleware
      role: 'admin',
      isActive: true
    });

    const customer = await User.create({
      name: 'Rohan Sharma',
      email: 'customer@vardaanecom.com',
      password: 'customer123',
      role: 'customer',
      isActive: true,
      addresses: [
        {
          title: 'Home Address',
          street: 'Flat No 102, Green Valley Apartments',
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110001',
          country: 'India',
          isDefault: true
        }
      ]
    });

    console.log('Admin & Customer accounts seeded.');

    // 2. Create Categories
    const rings = await Category.create({ name: 'Rings', slug: 'rings', description: 'Handcrafted gold, diamond, and precious gemstone rings' });
    const necklaces = await Category.create({ name: 'Necklaces', slug: 'necklaces', description: 'Exquisite necklaces, chokers, and cord pendants' });
    const earrings = await Category.create({ name: 'Earrings', slug: 'earrings', description: 'Stunning studs, hoops, and droplet earrings' });
    const sets = await Category.create({ name: 'Sets', slug: 'sets', description: 'Coordinated luxury jewelry sets' });

    console.log('Categories seeded.');

    // 3. Create Products
    const productsData = [
      {
        name: 'Amara Solitaire Diamond Engagement Ring',
        description: 'A breathtaking solitaire ring featuring a brilliant round cut natural diamond secured in a classic six-prong setting. Exquisite master craftsmanship and timeless beauty.',
        price: 65000,
        salePrice: 59999,
        sku: 'JWL-RNG-AMR1',
        inventory: 50,
        category: rings._id,
        isFeatured: true,
        salesCount: 15,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781529306/Lucy_Williams_Engravable_Arco_Gold_Ring_vggf77.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'Yellow Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '3.82 grams' },
          { key: 'Net Weight', value: '3.50 grams' },
          { key: 'Diamond Carats', value: '0.25 Ct' },
          { key: 'Diamond Clarity', value: 'VVS2' },
          { key: 'Diamond Color', value: 'G-H' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Elena Classic Diamond Eternity Ring',
        description: 'A stunning symbol of eternal love, this ring features circular brilliant-cut diamonds prong-set around the entire band for continuous, unmatched sparkle.',
        price: 48000,
        salePrice: 44999,
        sku: 'JWL-RNG-ELN2',
        inventory: 35,
        category: rings._id,
        isFeatured: true,
        salesCount: 22,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781528583/rings_pkq8gv.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'White Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '2.90 grams' },
          { key: 'Net Weight', value: '2.50 grams' },
          { key: 'Diamond Carats', value: '0.40 Ct' },
          { key: 'Diamond Clarity', value: 'VVS1' },
          { key: 'Diamond Color', value: 'F-G' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Zarah Emerald & Diamond Vintage Ring',
        description: 'Vintage-inspired ring featuring a lush green natural emerald center stone framed by a delicate halo of brilliant round-cut diamonds on a rose gold band.',
        price: 75000,
        salePrice: 69999,
        sku: 'JWL-RNG-ZRH3',
        inventory: 60,
        category: rings._id,
        isFeatured: false,
        salesCount: 18,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781528583/rings_pkq8gv.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'Rose Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '4.10 grams' },
          { key: 'Net Weight', value: '3.70 grams' },
          { key: 'Diamond Carats', value: '0.15 Ct' },
          { key: 'Gemstone Type', value: 'Natural Emerald (0.60 Ct)' },
          { key: 'Certification', value: 'SGL Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Aura Diamond Halo Pendant Necklace',
        description: 'A beautiful halo pendant necklace displaying a radiant central diamond surrounded by a sparkling halo of smaller pavé diamonds, hanging on a delicate gold chain.',
        price: 85000,
        salePrice: 79999,
        sku: 'JWL-NEC-AUR4',
        inventory: 40,
        category: necklaces._id,
        isFeatured: true,
        salesCount: 30,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781529483/Lucy_Williams_Engravable_Arco_Cord_Ring_fp3lgn.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'Yellow Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '6.20 grams' },
          { key: 'Net Weight', value: '5.80 grams' },
          { key: 'Diamond Carats', value: '0.35 Ct' },
          { key: 'Diamond Clarity', value: 'VS1' },
          { key: 'Diamond Color', value: 'G-H' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Seraphina Ruby Choker Necklace',
        description: 'An exquisite hand-crafted traditional collar necklace loaded with raw oval rubies and pearls set in pure gold, reflecting royal design language.',
        price: 180000,
        salePrice: 165000,
        sku: 'JWL-NEC-SRP5',
        inventory: 25,
        category: necklaces._id,
        isFeatured: true,
        salesCount: 28,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781525173/Rectangle_23_8_wrh0bx.png'],
        attributes: [
          { key: 'Karat', value: '22Kt Gold' },
          { key: 'Metal Color', value: 'Yellow Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '24.50 grams' },
          { key: 'Net Weight', value: '21.00 grams' },
          { key: 'Gemstone Type', value: 'Natural Ruby (5.50 Ct)' },
          { key: 'Certification', value: 'BIS 916 Hallmarked' }
        ]
      },
      {
        name: 'Classic Solitaire Diamond Pendant',
        description: 'Simple and elegant, this pendant showcases a single stunning D-color solitaire diamond on a white gold chain. The ultimate mark of pure luxury.',
        price: 120000,
        salePrice: 110000,
        sku: 'JWL-NEC-SLT6',
        inventory: 15,
        category: necklaces._id,
        isFeatured: true,
        salesCount: 50,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781525765/Rectangle_23_10_roxkwo.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'White Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '3.10 grams' },
          { key: 'Net Weight', value: '2.90 grams' },
          { key: 'Diamond Carats', value: '0.50 Ct' },
          { key: 'Diamond Clarity', value: 'VVS1' },
          { key: 'Diamond Color', value: 'D-F' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Sophia Diamond Cluster Stud Earrings',
        description: 'Exquisitely styled earrings showcasing clusters of brilliant round-cut diamonds, perfect for carrying unmatched light and class to evening occasions.',
        price: 55000,
        salePrice: 49999,
        sku: 'JWL-EAR-SPH7',
        inventory: 8,
        category: earrings._id,
        isFeatured: true,
        salesCount: 35,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781528601/earing_fktmvk.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'White Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '3.40 grams' },
          { key: 'Net Weight', value: '3.10 grams' },
          { key: 'Diamond Carats', value: '0.30 Ct' },
          { key: 'Diamond Clarity', value: 'VVS2' },
          { key: 'Diamond Color', value: 'F-G' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Kiara Classic Gold Hoop Earrings',
        description: 'Graceful and timeless round gold hoops. Made with highly polished 22Kt yellow gold, this pair is essential for everyday luxury accessorizing.',
        price: 38000,
        salePrice: 34999,
        sku: 'JWL-EAR-KRA8',
        inventory: 20,
        category: earrings._id,
        isFeatured: true,
        salesCount: 12,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781591262/02_i6sorm.png'],
        attributes: [
          { key: 'Karat', value: '22Kt Gold' },
          { key: 'Metal Color', value: 'Yellow Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '5.60 grams' },
          { key: 'Net Weight', value: '5.60 grams' },
          { key: 'Certification', value: 'BIS 916 Hallmarked' }
        ]
      },
      {
        name: 'Iris Floral Diamond Droplet Earrings',
        description: 'Stunning floral droplet earrings set in rose gold, with cascading leaves featuring sparkling round brilliant cut diamonds.',
        price: 95000,
        salePrice: 89999,
        sku: 'JWL-EAR-IRS9',
        inventory: 45,
        category: earrings._id,
        isFeatured: false,
        salesCount: 10,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781591266/03_bkl3hm.png'],
        attributes: [
          { key: 'Karat', value: '18Kt Gold' },
          { key: 'Metal Color', value: 'Rose Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '6.80 grams' },
          { key: 'Net Weight', value: '6.20 grams' },
          { key: 'Diamond Carats', value: '0.55 Ct' },
          { key: 'Diamond Clarity', value: 'VS1' },
          { key: 'Diamond Color', value: 'G-H' },
          { key: 'Certification', value: 'IGI Certified, BIS Hallmarked' }
        ]
      },
      {
        name: 'Royal Rajkumari Kundan & Emerald Set',
        description: 'A majestic traditional bridal set consisting of a heavy Kundan necklace and drop earrings encrusted with premium emeralds and ruby droplets.',
        price: 450000,
        salePrice: 399999,
        sku: 'JWL-SET-RJL0',
        inventory: 12,
        category: sets._id,
        isFeatured: true,
        salesCount: 45,
        images: ['https://res.cloudinary.com/dlzxiy0tl/image/upload/v1781525757/Rectangle_23_9_fyoemo.png'],
        attributes: [
          { key: 'Karat', value: '22Kt Gold' },
          { key: 'Metal Color', value: 'Antique Gold' },
          { key: 'Metal Type', value: 'Gold' },
          { key: 'Gross Weight', value: '98.40 grams' },
          { key: 'Net Weight', value: '82.20 grams' },
          { key: 'Gemstone Type', value: 'Raw Emeralds & Kundan' },
          { key: 'Certification', value: 'BIS 916 Hallmarked' }
        ]
      }
    ];

    const seededProducts = await Product.create(productsData);
    console.log('Products seeded.');

    // 4. Create Initial Inventory Logs
    for (const prod of seededProducts) {
      await InventoryLog.create({
        product: prod._id,
        change: prod.inventory,
        type: 'stock_in',
        notes: 'Initial inventory seeding'
      });
    }

    // 5. Create Mock Orders for Analytics
    const mockOrder1 = await Order.create({
      user: customer._id,
      items: [
        {
          product: seededProducts[4]._id, // Elara Ring
          name: seededProducts[4].name,
          price: seededProducts[4].salePrice || seededProducts[4].price,
          quantity: 1
        },
        {
          product: seededProducts[2]._id, // Arco Ring
          name: seededProducts[2].name,
          price: seededProducts[2].salePrice || seededProducts[2].price,
          quantity: 2
        }
      ],
      shippingAddress: {
        street: 'Flat No 102, Green Valley Apartments',
        city: 'New Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      },
      shippingMethod: 'Express Delivery',
      shippingCost: 150,
      paymentMethod: 'Razorpay',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      totalAmount: (seededProducts[4].salePrice * 1) + (seededProducts[2].salePrice * 2) + 150,
      tracking: {
        carrier: 'Delhivery',
        awb: 'DLV992837482',
        statusHistory: [
          { status: 'confirmed', message: 'Order payment successfully verified by gateway' }
        ]
      }
    });

    // Record Transaction for mockOrder1
    await Transaction.create({
      order: mockOrder1._id,
      amount: mockOrder1.totalAmount,
      paymentGateway: 'Razorpay',
      transactionId: 'pay_Nsd938sbd72b',
      status: 'captured',
      paymentDetails: { card: '**** **** **** 4111', type: 'Visa' }
    });

    const mockOrder2 = await Order.create({
      user: customer._id,
      items: [
        {
          product: seededProducts[6]._id, // Luxe Hoops
          name: seededProducts[6].name,
          price: seededProducts[6].salePrice || seededProducts[6].price,
          quantity: 1
        }
      ],
      shippingAddress: {
        street: 'Flat No 102, Green Valley Apartments',
        city: 'New Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      },
      shippingMethod: 'Standard Delivery',
      shippingCost: 0,
      paymentMethod: 'Razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      totalAmount: seededProducts[6].salePrice,
      tracking: {
        carrier: '',
        awb: '',
        statusHistory: [
          { status: 'pending', message: 'Awaiting payment verification' }
        ]
      }
    });

    console.log('Mock orders and transactions seeded.');

    // 6. Create Notifications
    await Notification.create([
      {
        user: admin._id,
        title: 'Low Stock Alert',
        message: `Product "${seededProducts[6].name}" is low on stock (${seededProducts[6].inventory} remaining).`
      },
      {
        user: customer._id,
        title: 'Order Confirmed',
        message: `Your order #${mockOrder1._id} for ₹${mockOrder1.totalAmount} has been confirmed.`
      }
    ]);

    console.log('Notifications seeded.');

    // Seed coupons
    await Coupon.create([
      { code: 'VARDAAN50', discountType: 'percentage', discountValue: 50, minOrderAmount: 2000, expiryDate: new Date('2028-12-31') },
      { code: 'FLAT500', discountType: 'flat', discountValue: 500, minOrderAmount: 5000, expiryDate: new Date('2028-12-31') },
      { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrderAmount: 500, expiryDate: new Date('2028-12-31') }
    ]);
    console.log('Coupons seeded.');
    console.log('Seeding process complete! Close DB connection.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding process error:', error);
    process.exit(1);
  }
};

seedDB();

