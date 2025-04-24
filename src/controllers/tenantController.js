const Tenant = require('../models/tenantModel')
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const Razorpay = require("razorpay")
const otpModel = require('../models/otpModel')
const Property = require('../models/propertyModel')
const Favorite = require('../models/favoriteModel')
const Booking = require('../models/bookingModel')
const Landlord = require('../models/landlordModel')
const Payment = require('../models/paymentModel')
require('dotenv').config()

// Tenant signup
const tenantSignup = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneno, gender, status, createPassword, confirmPassword } = req.body;

        if (!firstName || !lastName || !email || !phoneno || !gender || !status || !createPassword || !confirmPassword) {
            return res.status(400).json({ error: true, message: "All fields are required" });
        }

        if (createPassword !== confirmPassword) {
            return res.status(400).json({ error: true, message: "Passwords do not match" });
        }

        const existingTenant = await Tenant.findOne({ email });
        if (existingTenant) {
            return res.status(400).json({ error: true, message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(createPassword, 10);

        const newTenant = new Tenant({
            firstName,
            lastName,
            email,
            phoneno,
            gender,
            status,
            createPassword: hashedPassword,
            confirmPassword: hashedPassword,
        });

        await newTenant.save();

        // Send Welcome Email
        await sendWelcomeEmail(email, firstName);

        const accessToken = jwt.sign(
            { tenantId: newTenant._id, email: newTenant.email, role: "tenant" },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            error: false,
            message: "Signup successful",
            accessToken
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};

// tenant login
const tenantLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ error: true, message: "Email and password are required" });
    }

    const tenant = await Tenant.findOne({ email });

    if (!tenant) {
        return res.json({ error: true, message: "Invalid email" });
    }

    // Ensure that createPassword is defined
    const storedPassword = tenant.createPassword;

    if (!storedPassword) {
        return res.json({ error: true, message: "No password found in database" });
    }

    const match = await bcrypt.compare(password, storedPassword);

    if (!match) {
        return res.json({ error: true, message: "Invalid password" });
    }

    const accessToken = jwt.sign(
        { tenantId: tenant._id, email: tenant.email, role: "tenant" },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
    );

    return res.status(200).json({
        error: false,
        message: "Login successful",
        accessToken: accessToken,
        tenantId: tenant._id,
        tenantName: {
            firstName: tenant.firstName,
            lastName: tenant.lastName
        }
    });
};



var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.PASS_KEY
    }
});

function generateOTP() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// send otp 
const sendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ error: true, message: "Email is required" });
    }

    const tenant = await Tenant.findOne({ email: email });

    if (!tenant) {
        return res.json({ error: true, message: "Invalid email" });
    }
    else {

        const otp = generateOTP();


        const otpExpires = Date.now() + 60000; // OTP expires in 1 minute

        const tenant = await otpModel.findOne({ email: email });
        const existingOtp = await otpModel.findOne({ email });
        if (existingOtp) {
            // Update existing OTP
            await otpModel.updateOne({ email }, { otp, otpExpires });
        } else {
            // Create new OTP record
            const newOtp = new otpModel({ email, otp, otpExpires });
            await newOtp.save();
        }

        if (tenant) {
            await otpModel.findOneAndUpdate(
                { email },
                { otp, otpExpires },
                { new: true } // Returns the updated document
            );
        } else {
            const newOtp = new otpModel({
                email,
                otp,
                otpExpires
            })

            await newOtp.save();
        }

        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP',
            text: 'otp is: ' + otp
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    return res.json({ error: false });
}


// validate otp
const validateOTP = async (req, res) => {
    const { email, otp } = req.body;

    let otp_data = await otpModel.findOne({ email: email });

    if (!otp_data) {
        return res.json({ error: true, message: "No OTP found for this email. Please request a new OTP." });
    }

    if (otp_data.otpExpires < Date.now()) {
        return res.json({ error: true, message: "Expired OTP! Please click on resend OTP." });
    }

    if (otp !== otp_data.otp) {
        return res.json({ error: true, message: "Invalid OTP" });
    }

    res.json({ error: false, message: "OTP verified" });
}


// change password
const changePassword = async (req, res) => {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await Tenant.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true } // Returns the updated document
    );

    return res.json({ error: false });
}


// Function to send a welcome email
const sendWelcomeEmail = async (email, firstName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "🎉 Welcome to PG Finder!",
            text: `Hello ${firstName},\n\nWelcome to PG Finder! We are excited to have you on board.\n\nStart exploring and find the best PGs around you!\n\nHappy Searching!\nPG Finder Team`
        };

        await transporter.sendMail(mailOptions);
        console.log("Welcome email sent successfully to", email);
    } catch (error) {
        console.error("Error sending welcome email:", error);
    }
};


//Get all PG listings
const getProperty = async (req, res) => {
    try {

        const properties = await Property.find()
            .populate("cityId")
            .populate("areaId")
            .populate("stateId")
            .populate("landlordId", "name email phoneno");

        res.status(200).json({ success: true, data: properties });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
}

// get favorites
const getFavorites = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const favorites = await Favorite.find({ tenantId }).populate({
            path: "propertyId",
            populate: [
                { path: "cityId", select: "name" },
                { path: "stateId", select: "name" },
                { path: "areaId", select: "name" },
                { path: "landlordId", select: "name email phoneno" } // ✅ Populating landlord details
            ]
        });

        const properties = favorites
            .filter(fav => fav.propertyId) // Ensure propertyId exists
            .map(({ propertyId }) => ({
                id: propertyId._id.toString(),
                image: propertyId.image || "/default-image.jpg",
                propertyName: propertyId.propertyName || "Unnamed Property",
                title: propertyId.title || "No Title",
                address: propertyId.address || "No Address",
                bedrooms: propertyId.bedrooms || "Not specified",
                bathrooms: propertyId.bathrooms || "Not specified",
                basePrice: propertyId.basePrice || "0",
                description: propertyId.description || "No Description Available",
                furnishingStatus: propertyId.furnishingStatus || "Not Specified",
                availabilityStatus: propertyId.availabilityStatus || "Not Specified",
                rating: propertyId.rating || "No Rating",
                city: propertyId.cityId?.name || "Unknown City",
                state: propertyId.stateId?.name || "Unknown State",
                area: propertyId.areaId?.name || "Unknown Area",

                // ✅ Fetching landlord details
                landlord: {
                    id: propertyId.landlordId?._id?.toString() || "NA",
                    name: propertyId.landlordId?.name || "NA",
                    email: propertyId.landlordId?.email || "NA",
                    phoneno: propertyId.landlordId?.phoneno || "NA",
                }
            }));

        res.json({ success: true, data: properties });

    } catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


// Add Favorite
const addFavorite = async (req, res) => {
    const { tenantId, propertyId } = req.body



    if (!tenantId || !propertyId) {
        return res.status(400).json({
            success: false,
            message: "Missing tenantId or propertyId",
            received: { tenantId, propertyId },
        })
    }

    try {
        // Check if the property exists
        const propertyExists = await Property.findById(propertyId)
        if (!propertyExists) {
            return res.status(404).json({ success: false, message: "Property not found" })
        }

        // Check if already favorited
        const existingFavorite = await Favorite.findOne({ tenantId, propertyId })
        if (existingFavorite) {
            return res.status(409).json({ success: false, message: "Property already favorited" })
        }

        // Add favorite
        const newFavorite = new Favorite({ tenantId, propertyId })
        await newFavorite.save()

        res.status(201).json({ success: true, message: "Property added to favorites" })
    } catch (error) {
        console.error("Error adding favorite:", error)
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        })
    }
}

// Remove Favorite
const removeFavorite = async (req, res) => {
    const { tenantId, propertyId } = req.params

    if (!tenantId || !propertyId) {
        return res.status(400).json({ success: false, message: "Missing tenantId or propertyId" })
    }

    try {
        // Find and remove the favorite
        const result = await Favorite.findOneAndDelete({ tenantId, propertyId })

        if (!result) {
            return res.status(404).json({ success: false, message: "Favorite not found" })
        }

        res.status(200).json({ success: true, message: "Property removed from favorites" })
    } catch (error) {
        console.error("Error removing favorite:", error)
        res.status(500).json({ success: false, message: "Server error" })
    }
}

// Create a new booking
const createBooking = async (req, res) => {
    try {
        const { tenantId, propertyId, landlordId, checkInDate, checkOutDate, totalAmount } = req.body;

        // Check if a booking already exists for the same tenant and property within the same date range
        const existingBooking = await Booking.findOne({
            tenantId,
            propertyId,
            $or: [
                {
                    checkInDate: { $lte: checkOutDate },
                    checkOutDate: { $gte: checkInDate }
                }
            ]
        });

        if (existingBooking) {
            return res.status(400).json({ error: true, message: "You have already booked this PG for the selected dates." });
        }

        const newBooking = new Booking({
            tenantId,
            propertyId,
            landlordId,
            checkInDate,
            checkOutDate,
            totalAmount,
            status: "pending",
            paymentStatus: "pending"
        });

        await newBooking.save();

        res.status(201).json({ success: true, message: "Booking request submitted", data: newBooking });
    } catch (error) {
        res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};


// Get bookings by tenant
const getBookingsByTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: true, message: "Tenant ID is required" });
        }

        const bookings = await Booking.find({ tenantId })
            .populate({
                path: 'propertyId',
                select: 'propertyName image basePrice furnishingStatus cityId',
                populate: {
                    path: 'cityId',  // This will populate cityId with actual city data
                    select: 'name'   // Fetch only the city name
                }
            })
            .populate('landlordId', 'name phoneno email');

        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};


// Update booking status
const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        if (!bookingId || !status) {
            return res.status(400).json({ error: true, message: "Booking ID and status are required" });
        }

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            { status },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ error: true, message: "Booking not found" });
        }

        res.status(200).json({ success: true, message: "Booking status updated", data: booking });
    } catch (error) {
        res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};

// Delete a booking
const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!bookingId) {
            return res.status(400).json({ error: true, message: "Booking ID is required" });
        }

        const booking = await Booking.findByIdAndDelete(bookingId);

        if (!booking) {
            return res.status(404).json({ error: true, message: "Booking not found" });
        }

        res.status(200).json({ success: true, message: "Booking deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};


//get dashboard data
const getTenantDashboard = async (req, res) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId || tenantId.length !== 24) {
            return res.status(400).json({ error: true, message: "Invalid tenant ID" });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ error: true, message: "Tenant not found" });
        }

        // Define last month's date range
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Fetch previous month counts for trends
        const [prevProperties, prevLandlords, prevTenants, prevBookings] = await Promise.all([
            Property.countDocuments({ createdAt: { $lte: lastMonth } }),
            Landlord.countDocuments({ createdAt: { $lte: lastMonth } }),
            Tenant.countDocuments({ createdAt: { $lte: lastMonth } }),
            Booking.countDocuments({ status: "confirmed", createdAt: { $lte: lastMonth } }),
        ]);

        // Fetch current stats
        const [totalProperties, totalLandlords, totalTenants, activeBookings, totalBookings, respondedBookings, totalFavorites] = await Promise.all([
            Property.countDocuments(),
            Landlord.countDocuments(),
            Tenant.countDocuments(),
            Booking.countDocuments({ status: "confirmed" }),
            Booking.countDocuments(),
            Booking.countDocuments({ status: { $in: ["rejected", "confirmed"] } }),
            Favorite.countDocuments({ tenantId }), // Count tenant's favorites
        ]);

        // Trend Calculation
        const calculateTrend = (current, previous) => {
            if (previous === 0) return "+100%"; // Prevent division by zero
            const change = ((current - previous) / previous) * 100;
            return (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
        };

        const trends = {
            totalProperties: calculateTrend(totalProperties, prevProperties),
            totalLandlords: calculateTrend(totalLandlords, prevLandlords),
            totalTenants: calculateTrend(totalTenants, prevTenants),
            activeBookings: calculateTrend(activeBookings, prevBookings),
        };

        // Performance Metrics Calculation
        const responseRate = totalBookings > 0 ? ((respondedBookings / totalBookings) * 100).toFixed(1) : 0;
        const bookingCompletionRate = totalBookings > 0 ? ((activeBookings / totalBookings) * 100).toFixed(1) : 0;
        const favoriteUtilizationRate = totalProperties > 0 ? ((totalFavorites / totalProperties) * 100).toFixed(1) : 0;

        const performanceMetrics = {
            responseRate: Number(responseRate),
            bookingCompletionRate: Number(bookingCompletionRate),
            favoriteUtilizationRate: Number(favoriteUtilizationRate),
        };

        // Fetch recent tenant activities
        const recentActivities = await Booking.find({ tenantId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("propertyId", "propertyName")
            .lean();

        const formattedActivities = recentActivities.map((booking) => ({
            type: "Booking",
            user: tenant.firstName + " " + tenant.lastName,
            time: new Date(booking.createdAt).toLocaleDateString(),
            status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
            propertyName: booking.propertyId?.propertyName || "Unknown Property",
        }));

        return res.status(200).json({
            error: false,
            data: {
                stats: { totalProperties, totalLandlords, totalTenants, activeBookings },
                trends,
                performanceMetrics,
                recentActivities: formattedActivities,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return res.status(500).json({ error: true, message: "Server error", details: error.message });
    }
};


// Get tenant by ID
const getTenantById = async (req, res) => {
    try {
        const { tenantId } = req.params

        if (!tenantId) {
            return res.status(400).json({ error: true, message: "Tenant ID is required" })
        }

        const tenant = await Tenant.findById(tenantId)

        if (!tenant) {
            return res.status(404).json({ error: true, message: "Tenant not found" })
        }

        res.status(200).json({
            error: false,
            data: tenant,
        })
    } catch (error) {
        console.error("Error fetching tenant:", error)
        res.status(500).json({ error: true, message: "Server error", details: error.message })
    }
}

// update tenant
const updateTenant = async (req, res) => {
    try {
        const { tenantId } = req.params
        const { firstName, lastName, email, phoneno, location, profileImage } = req.body

        if (!tenantId) {
            return res.status(400).json({ error: true, message: "Tenant ID is required" })
        }

        // Check if email already exists for another tenant
        if (email) {
            const existingTenant = await Tenant.findOne({ email, _id: { $ne: tenantId } })
            if (existingTenant) {
                return res.status(400).json({ error: true, message: "Email already in use by another tenant" })
            }
        }

        // Create update object dynamically
        const updateData = {}
        if (firstName) updateData.firstName = firstName
        if (lastName) updateData.lastName = lastName
        if (email) updateData.email = email
        if (phoneno) updateData.phoneno = phoneno
        if (location) updateData.location = location
        if (profileImage) updateData.profileImage = profileImage  // ✅ Profile Image is now included

        const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, updateData, { new: true, runValidators: true })

        if (!updatedTenant) {
            return res.status(404).json({ error: true, message: "Tenant not found" })
        }

        res.status(200).json({
            error: false,
            message: "Tenant profile updated successfully",
            data: updatedTenant,
        })
    } catch (error) {
        console.error("Error updating tenant:", error)
        res.status(500).json({ error: true, message: "Server error", details: error.message })
    }
}


//home page msg send
const sendContactMessage = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.PASS_KEY,
            },
        });

        const mailOptions = {
            from: `"PG Finder" <${process.env.EMAIL_USER}>`,
            to: email, // 👈 Send the email to the sender
            subject: "Thanks for Contacting PG Finder!",
            html: `
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thanks for reaching out to us. We have received your message:</p>
          <blockquote>${message}</blockquote>
          <p>We'll get back to you shortly.</p>
          <br/>
          <p>– The PG Finder Team</p>
        `,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Confirmation email sent to sender!" });
    } catch (error) {
        console.error("Email send error:", error);
        res.status(500).json({ error: "Failed to send email." });
    }
};

//verify payment
const verifyPayment = async (req, res) => {
    const { bookingId, paymentId, orderId, signature, tenantId } = req.body;
  
    try {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
  
      if (generatedSignature !== signature) {
        return res.status(400).json({ message: "Invalid signature." });
      }
  
      // 👇 Proper nested population to get landlord info
      const booking = await Booking.findById(bookingId).populate({
        path: "propertyId",
        populate: {
          path: "landlordId",
          model: "Landlord", // Make sure this matches your model registration
          select: "name email",
        },
      });
  
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
  
      // Debug log to verify population
      console.log("Populated Booking:", JSON.stringify(booking, null, 2));
  
      // Update booking payment info
      booking.paymentStatus = "paid";
      booking.paymentMethod = "Razorpay";
      booking.paymentId = paymentId;
      booking.tenant = tenantId;
      await booking.save();
  
      // Safely extract landlord name
      const landlordName = booking?.propertyId?.landlordId?.name || "Landlord";
    //   console.log("Resolved Landlord Name:", landlordName);
  
      // Save Payment record
      const payment = new Payment({
        bookingId: booking._id,
        transactionId: paymentId,
        amount: booking.totalPrice,
        paymentDate: new Date(),
        paymentMethod: "Razorpay",
        status: "completed",
        receiverName: landlordName,
      });
  
      await payment.save();
  
      res.status(200).json({
        message: "Payment verified and recorded",
        booking,
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

module.exports = {
    tenantLogin,
    tenantSignup,
    sendOTP,
    validateOTP,
    changePassword,
    getProperty,
    getFavorites,
    addFavorite,
    removeFavorite,
    createBooking,
    getBookingsByTenant,
    updateBookingStatus,
    deleteBooking,
    getTenantDashboard,
    getTenantById,
    updateTenant,
    sendContactMessage,
    verifyPayment
};