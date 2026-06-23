import 'dotenv/config';
import dns from "node:dns";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.VERCEL) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

import connectDB from "./src/config/db.js";
import { notFound, errorHandler } from "./src/middleware/errorMiddleware.js";

// Route Imports
import authRoutes from "./src/routes/authRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import cartRoutes from "./src/routes/cartRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import customerRoutes from "./src/routes/customerRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import couponRoutes from "./src/routes/couponRoutes.js";
import returnRoutes from "./src/routes/returnRoutes.js";
import contactRoutes from "./src/routes/contactRoutes.js";

// dotenv.config() is not needed here as 'dotenv/config' is loaded at the top to resolve import hoisting issues

const app = express();



// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// React Build (public folder)
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/contact", contactRoutes);

// Health Check
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vardaan E-commerce Backend API Running",
  });
});

// React Routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

const startServer = async (port = DEFAULT_PORT, attempts = 0) => {
  try {
    await connectDB().then(() => {
      console.log("MongoDB Connected");
    });
    const server = app.listen(port, () => {
      console.log(
        `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port http://localhost:${port}`
      );
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use.`);
        if (process.env.NODE_ENV !== 'production' && attempts < 5) {
          const nextPort = port + 1;
          console.log(`Attempting to start on port ${nextPort} instead...`);
          // try next port
          startServer(nextPort, attempts + 1);
        } else {
          console.error('Unable to bind to a port. Exiting.');
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


  startServer();



