// ==========================
// LOAD ENV VARIABLES
// ==========================
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");

// Check required environment variables
const requiredEnvVars = ['MONGO_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// ==========================
// IMPORT PACKAGES
// ==========================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

// ==========================
// GLOBAL MIDDLEWARE
// ==========================
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"], 
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000, 
    },
  })
);

// ==========================
// EMAIL CONFIGURATION
// ==========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

transporter.verify((error) => {
  if (error) console.error("❌ Email transporter error:", error.message);
  else console.log("✅ Email server ready");
});

// ==========================
// MONGODB CONNECTION
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Vertex Database Connected"))
  .catch((err) => console.error("❌ Database Connection Error:", err));

// ==========================
// SCHEMA & MODEL
// ==========================
const appointmentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true },
    emailAddress: { type: String, trim: true },
    department: { type: String, required: true },
    doctorName: { type: String, trim: true },
    reasonForVisit: { type: String, trim: true },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

// ==========================
// ROUTES
// ==========================

// 1. CREATE APPOINTMENT (Public)
app.post("/api/appointments", async (req, res) => {
  try {
    const { fullName, mobileNumber, department, emailAddress, doctorName, reasonForVisit } = req.body;

    if (!fullName || !mobileNumber || !department) {
      return res.status(400).json({ message: "Missing required fields: Name, Phone, or Department" });
    }

    // Save to Database
    const newAppointment = new Appointment(req.body);
    const savedData = await newAppointment.save();

    // 2. Send formatted email to Admin
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const mailOptions = {
        from: `"${fullName}" <${process.env.EMAIL_USER}>`, // Shows patient name in your inbox
        replyTo: emailAddress || "No Email Provided", // Let's you reply directly to the patient
        to: process.env.EMAIL_USER, // Sends to your admin email
        subject: `🩺 New Appointment Booked - ${fullName}`,
        text: `
New Appointment Details:

Name: ${fullName}
Mobile: ${mobileNumber}
Email: ${emailAddress || "N/A"}
Department: ${department}
Doctor: ${doctorName || "Not specified"}
Reason: ${reasonForVisit || "Not specified"}

Booked At: ${new Date().toLocaleString()}

---
Reply to this email to contact the patient directly.
        `,
      };
      
      transporter.sendMail(mailOptions).catch(err => console.log("Email Notification Error:", err.message));
    }

    res.status(201).json({ message: "Success", data: savedData });
  } catch (err) {
    console.error("❌ Booking Error:", err);
    res.status(500).json({ message: "Server error while saving appointment." });
  }
});

// 2. ADMIN LOGIN
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ message: "Login successful" });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

// 3. PROTECTED ADMIN VIEW
app.get("/api/appointments", async (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({ message: "Unauthorized" });
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});
