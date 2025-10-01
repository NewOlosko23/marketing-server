import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fs from "fs";
import "express-async-errors";
// Environment variables are now hardcoded

const app = express();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import apiKeyRoutes from "./routes/apiKeys.js";
import quotaRoutes from "./routes/quotas.js";
import emailRoutes from "./routes/emails.js";
import smsRoutes from "./routes/sms.js";
import analyticsRoutes from "./routes/analytics.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import campaignRoutes from "./routes/campaigns.js";
import templateRoutes from "./routes/templates.js";
import contactGroupRoutes from "./routes/contact-groups.js";
import contactRoutes from "./routes/contacts.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Development frontend URL (Vite default)
      "http://localhost:3000", // Alternative development URL
      "http://localhost:3001", // Alternative development URL
      "https://marketing-build.onrender.com" // Production frontend URL
    ],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: "development", // Hardcoded environment
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/quotas", quotaRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/contact-groups", contactGroupRoutes);
app.use("/api/contacts", contactRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://oloogeorge633_db_user:oloogeorge633_db_user@cluster0.rgrun31.mongodb.net/marketing_firm?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  mongoose.connection.close(() => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  mongoose.connection.close(() => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
});

const PORT = 5000; // Hardcoded port

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: development`); // Hardcoded environment
});

export default app;
