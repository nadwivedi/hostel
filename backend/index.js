const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/mongodb");
const { startPaymentJobs } = require("./jobs/paymentJobs");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const roomRoutes = require("./routes/roomRoutes");
const occupancyRoutes = require("./routes/occupancyRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const statsRoutes = require("./routes/statsRoutes");
const locationRoutes = require("./routes/locationRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://hosteladm.softwarebytes.in",
      "https://hostelapi.softwarebytes.in",
      "https://hostel.softwarebytes.in",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/occupancies", occupancyRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/locations", locationRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Hostel Management API is running" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Start cron jobs
  console.log("========================================");
  console.log("🚀 Initializing Cron Jobs...");
  console.log("========================================");

  startPaymentJobs();

  console.log("========================================");
  console.log("✅ All cron jobs initialized successfully");
  console.log("========================================");
});
