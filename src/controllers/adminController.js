const Admin = require('../models/adminModel')
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const otpModel = require('../models/otpModel')
const Tenant = require('../models/tenantModel')
const Landlord = require('../models/landlordModel')
const Property = require('../models/propertyModel')
const Booking = require('../models/bookingModel')
const Message = require('../models/messageModel')
const City = require('../models/cityModel')
require('dotenv').config()


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

    const admin = await Admin.findOne({ email: email });

    if (!admin) {
        return res.json({ error: true, message: "Invalid email" });
    }
    else {

        const otp = generateOTP();


        const otpExpires = Date.now() + 60000; // OTP expires in 1 minute

        const admin = await otpModel.findOne({ email: email });
        const existingOtp = await otpModel.findOne({ email });
        if (existingOtp) {
            // Update existing OTP
            await otpModel.updateOne({ email }, { otp, otpExpires });
        } else {
            // Create new OTP record
            const newOtp = new otpModel({ email, otp, otpExpires });
            await newOtp.save();
        }

        if (admin) {
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

    await Admin.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true } // Returns the updated document
    );

    return res.json({ error: false });
}


//admin login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ error: true, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email });

    if (!admin) {
        return res.json({ error: true, message: "Invalid email" });
    }

    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
        return res.json({ error: true, message: "Invalid password" });
    }

    const accessToken = jwt.sign({ adminId: admin._id, email: admin.email, role: "admin" }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
    });

    return res.status(200).json({
        error: false,
        message: "Login successful",
        accessToken
    });
}


// to fetch all tenants and landlords
const getUsers = async (req, res) => {
    try {
        const { role, status } = req.query;
        let tenants = [];
        let landlords = [];

        let statusFilter = status ? { status: new RegExp(`^${status}$`, "i") } : {}; // Case-insensitive filtering

        if (!role || role.toLowerCase() === "tenant") {
            tenants = await Tenant.find(statusFilter);
        }

        if (!role || role.toLowerCase() === "landlord") {
            landlords = await Landlord.find(statusFilter);
        }

        const formattedTenants = tenants.map((tenant) => ({
            _id: tenant._id,
            firstName: `${tenant.firstName}`,
            lastName: `${tenant.lastName}`,
            role: "Tenant",
            email: tenant.email,
            phoneno: tenant.phoneno,
            gender: tenant.gender,
            status: tenant.status,
        }));

        const formattedLandlords = landlords.map((landlord) => ({
            _id: landlord._id,
            name: landlord.name,
            role: "Landlord",
            email: landlord.email,
            phoneno: landlord.phoneno,
            agencyName: landlord.agencyName,
            rating: landlord.rating,
            address: landlord.address,
            licenseNo: landlord.licenseNo,
            experienceYears: landlord.experienceYears,
            status: landlord.status,
        }));

        const users = [...formattedTenants, ...formattedLandlords];


        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



// delete users
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        //  find and delete from Tenant collection
        const tenant = await Tenant.findByIdAndDelete(id);
        if (tenant) {
            return res.status(200).json({ message: "Tenant deleted successfully" });
        }

        //  find and delete from Landlord collection
        const landlord = await Landlord.findByIdAndDelete(id);
        if (landlord) {
            return res.status(200).json({ message: "Landlord deleted successfully" });
        }

        return res.status(404).json({ error: "User not found" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        let user = await Tenant.findById(id);
        if (user) {
            const updatedTenant = await Tenant.findByIdAndUpdate(id, updateData, { new: true });
            return res.status(200).json({ message: "Tenant updated successfully", user: updatedTenant });
        }

        user = await Landlord.findById(id);
        if (user) {
            const updatedLandlord = await Landlord.findByIdAndUpdate(id, updateData, { new: true });
            return res.status(200).json({ message: "Landlord updated successfully", user: updatedLandlord });
        }

        return res.status(404).json({ error: "User not found" });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
// get user by id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || id.length !== 24) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        let user = await Tenant.findById(id) || await Landlord.findById(id);

        if (user) {
            return res.status(200).json(user);
        }

        return res.status(404).json({ error: "User not found" });

    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



// add users
const addUser = async (req, res) => {
    try {
        console.log("Received Data:", req.body); // ✅ Debugging

        const { role, createPassword, confirmPassword, ...userData } = req.body;

        // Validate passwords
        if (createPassword !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        // Check if email exists
        const existingUser = await Tenant.findOne({ email: userData.email }) ||
            await Landlord.findOne({ email: userData.email });

        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createPassword, 10);

        let newUser;
        if (role === "Tenant") {
            newUser = new Tenant({ ...userData, password: hashedPassword, status: userData.status || "Active" });
        } else if (role === "Landlord") {
            newUser = new Landlord({ ...userData, password: hashedPassword, status: userData.status || "Active" });
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }

        await newUser.save();
        res.status(201).json({ message: "User added successfully", user: newUser });

    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

// Add Property
const addProperty = async (req, res) => {

    try {

        const { title, propertyName, address, stateId, cityId,landlordId, areaId, bedrooms, bathrooms, rating, description, basePrice, furnishingStatus, availabilityStatus, image } = req.body;

        if (!req.user.adminId) {
            return res.status(403).json({ error: true, message: "Unauthorized - landlordId missing" });
        }

        const newProperty = new Property({
            title,
            propertyName,
            landlordId, // Ensure this is available
            address,
            stateId,
            cityId,
            areaId,
            bedrooms,
            bathrooms,
            rating,
            description,
            basePrice,
            furnishingStatus,
            availabilityStatus,
            image,
        });

        await newProperty.save();
        res.status(201).json({ success: true, message: "Property added successfully", data: newProperty });

    } catch (error) {
        console.error("Error adding property:", error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            details: error.message,
        });
    }
};


// Get All Properties
const getProperties = async (req, res) => {
    try {
        const properties = await Property.find()
            .populate("cityId")
            .populate("areaId")
            .populate("stateId")
            .populate("landlordId", "name email phoneno");

        res.json({ success: true, data: properties });
    } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(500).json({ success: false, message: "Error fetching properties", error });
    }
};


// Get Property by ID
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || id.length !== 24) {
            return res.status(400).json({ error: "Invalid property ID" });
        }

        const property = await Property.findById(id).populate("categoryId cityId stateId areaId tenantId");

        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        return res.status(200).json(property);
    } catch (error) {
        console.error("Error fetching property:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// Update Property
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedProperty = await Property.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedProperty) {
            return res.status(404).json({ error: "Property not found" });
        }

        return res.status(200).json({ message: "Property updated successfully", property: updatedProperty });
    } catch (error) {
        console.error("Error updating property:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// Delete Property
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedProperty = await Property.findByIdAndDelete(id);

        if (!deletedProperty) {
            return res.status(404).json({ error: "Property not found" });
        }

        return res.status(200).json({ message: "Property deleted successfully" });
    } catch (error) {
        console.error("Error deleting property:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


// Get All Landlords
const getLandlords = async (req, res) => {
    try {
        const landlords = await Landlord.find()
            .select('_id name email phoneno')
            .sort({ name: 1 });

        res.json({
            success: true,
            message: "Landlords fetched successfully",
            data: landlords
        });
    } catch (error) {
        console.error("Error fetching landlords:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching landlords",
            error: error.message
        });
    }
};

// get admin dashboard
const getAdminDashboard = async (req, res) => {
    try {
        // Fetch counts
        const totalTenants = await Tenant.countDocuments();
        const totalLandlords = await Landlord.countDocuments();
        const totalProperties = await Property.countDocuments();
        const totalBookings = await Booking.countDocuments();

        // Fetch recent bookings with user and PG (property) name
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 }) // Get latest bookings
            .limit(10) // Limit to 10 recent bookings
            .populate("tenantId", "firstName lastName") // Get tenant name
            .populate("propertyId", "propertyName") // Get PG name
            .select("status checkInDate tenantId propertyId");

        // Format recent bookings
        const formattedBookings = recentBookings.map(booking => ({
            id: booking._id,
            user: `${booking.tenantId.firstName} ${booking.tenantId.lastName}`,
            pg: booking.propertyId ? booking.propertyId.propertyName : "N/A",
            date: booking.checkInDate.toISOString().split("T")[0],
            status: booking.status
        }));

        res.status(200).json({
            success: true,
            data: {
                totalTenants,
                totalLandlords,
                totalProperties,
                totalBookings,
                recentBookings: formattedBookings
            }
        });
    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};


// Get all conversations across all tenants and landlords
const getAllConversations = async (req, res) => {
    try {
      // Fetch all messages, sorted by most recent
      const messages = await Message.find({}).sort({ createdAt: -1 });
  
      const conversationMap = {};
  
      for (const message of messages) {
        const propertyId = message.propertyId?.toString();
        if (!propertyId) continue;
  
        let tenantId, landlordId;
  
        if (message.senderType === "tenant") {
          tenantId = message.senderId?.toString();
          landlordId = message.receiverId?.toString();
        } else {
          landlordId = message.senderId?.toString();
          tenantId = message.receiverId?.toString();
        }
  
        // Ensure all keys are valid before proceeding
        if (!propertyId || !tenantId || !landlordId) continue;
  
        const key = `${propertyId}_${tenantId}_${landlordId}`;
  
        if (!conversationMap[key]) {
          conversationMap[key] = {
            propertyId,
            tenantId,
            landlordId,
            messages: [],
          };
        }
  
        conversationMap[key].messages.push(message);
      }
  
      // Get detailed conversation info (with messages grouped above)
      const conversations = await Promise.all(
        Object.values(conversationMap).map(async (conv) => {
          return await getConversationDetailsForAdmin(
            conv.messages,
            conv.tenantId,
            conv.landlordId,
            conv.propertyId
          );
        })
      );
  
      // Sort by most recent activity
      conversations.sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity) - new Date(a.lastActivity);
      });
  
      res.status(200).json({
        error: false,
        data: conversations,
      });
    } catch (error) {
      console.error("Error getting all conversations:", error);
      res.status(500).json({
        error: true,
        message: "Failed to get conversations",
      });
    }
  };
  
// Helper function to get conversation details for admin view
const getConversationDetailsForAdmin = async (messages, tenantId, landlordId, propertyId) => {
    try {
      const [tenant, landlord, property] = await Promise.all([
        Tenant.findById(tenantId),
        Landlord.findById(landlordId),
        Property.findById(propertyId),
      ]);
  
      // Fetch city name if cityId exists
      let cityName = null;
      if (property?.cityId) {
        const city = await City.findById(property.cityId);
        cityName = city?.name || null;
      }
  
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  
      let readByTenant = true;
      let readByLandlord = true;
  
      if (lastMessage) {
        if (lastMessage.senderType === "landlord") {
          readByTenant = lastMessage.read;
        } else if (lastMessage.senderType === "tenant") {
          readByLandlord = lastMessage.read;
        }
      }
  
      return {
        _id: `${propertyId}_${tenantId}_${landlordId}`,
        participants: {
          tenant: tenant
            ? {
                _id: tenant._id,
                firstName: tenant.firstName,
                lastName: tenant.lastName,
                email: tenant.email,
                phone: tenant.phoneno,
                profileImage: tenant.profileImage,
                createdAt: tenant.createdAt,
              }
            : null,
          landlord: landlord
            ? {
                _id: landlord._id,
                name: landlord.name,
                email: landlord.email,
                phone: landlord.phoneno,
                profileImage: landlord.profileImage,
                propertyCount: await Property.countDocuments({ landlordId: landlord._id }),
                createdAt: landlord.createdAt,
              }
            : null,
        },
        property: property
          ? {
              _id: property._id,
              name: property.propertyName,
              city: cityName, // ✅ City name
              basePrice: property.basePrice, // ✅ Rent
              availabilityStatus: property.availabilityStatus, // ✅ Status
            }
          : null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderType: lastMessage.senderType,
              readByTenant,
              readByLandlord,
            }
          : null,
        messageCount: messages.length,
        lastActivity: lastMessage ? lastMessage.createdAt : null,
      };
    } catch (error) {
      console.error("Error getting conversation details for admin:", error);
      throw error;
    }
  };
  
  
  
  // Get conversation statistics for admin dashboard
  const getConversationStats = async (req, res) => {
    try {
      // Get total number of messages
      const totalMessages = await Message.countDocuments({})
  
      // Get messages from the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentMessages = await Message.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      })
  
      // Get unread messages count
      const unreadMessages = await Message.countDocuments({ read: false })
  
      // Get count of active conversations (with messages in the last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
      const recentMessagesByConversation = await Message.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              propertyId: "$propertyId",
              tenantId: {
                $cond: [{ $eq: ["$senderType", "tenant"] }, "$senderId", "$receiverId"],
              },
              landlordId: {
                $cond: [{ $eq: ["$senderType", "landlord"] }, "$senderId", "$receiverId"],
              },
            },
          },
        },
        {
          $count: "activeConversations",
        },
      ])
  
      const activeConversations =
        recentMessagesByConversation.length > 0 ? recentMessagesByConversation[0].activeConversations : 0
  
      res.status(200).json({
        error: false,
        data: {
          totalMessages,
          recentMessages,
          unreadMessages,
          activeConversations,
        },
      })
    } catch (error) {
      console.error("Error getting conversation stats:", error)
      res.status(500).json({
        error: true,
        message: "Failed to get conversation statistics",
      })
    }
  }

  // in chat fetch property details
  const fetchPropertyDetails = async (req, res) => {
      const id = req.body.propertyId;
      const property = await Property.findById(id);
      res.status(200).json({
        data: {
          propertyName: property?.propertyName,
          city: property?.cityId?.name,
          basePrice: property?.basePrice,
          availabilityStatus: property?.availabilityStatus,
        }
      });
  }


  // Get messages for a specific conversation
const getConversationMessages = async (req, res) => {
    try {
      const { propertyId: fullPropertyId } = req.body;
  
      if (!fullPropertyId) {
        return res.status(400).json({
          error: true,
          message: "propertyId is required in the request body.",
        });
      }
  
      const propertyId = fullPropertyId.split("_")[0];
  
      const property = await Property.findById(propertyId);
  
      const messages = await Message.find({
        propertyId: propertyId,
      }).sort({ createdAt: 1 });
  
      res.status(200).json({
        error: false,
        data: messages,
      });
    } catch (error) {
      console.error("Error getting conversation messages:", error);
      res.status(500).json({
        error: true,
        message: "Failed to get messages",
      });
    }
  };
  

  //analytics
  const analytics = async (req, res) => {
    try {
      // Fetch total number of properties
      const totalProperties = await Property.countDocuments();
  
      // Fetch total number of bookings
      const totalBookings = await Booking.countDocuments();
  
      // Fetch total revenue by summing the amount of all successful payments
      const totalRevenue = await Booking.aggregate([
        {
          $match: { paymentStatus: "paid" }, // Only consider paid bookings
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" }, // Change totalPrice to totalAmount
          },
        },
      ]);
  
      // Ensure the totalRevenue is defined even if no results are found
      const revenue = totalRevenue[0]?.totalRevenue || 0;
  
      res.json({
        totalProperties,
        totalBookings,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      res.status(500).json({ message: 'Error fetching analytics data' });
    }
  };
  
  
module.exports = {
    adminLogin,
    sendOTP,
    validateOTP,
    changePassword,
    getUsers,
    deleteUser,
    updateUser,
    getUserById,
    addUser,
    addProperty,
    getProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    getLandlords,
    getAdminDashboard,
    getAllConversations,
    getConversationStats,
    fetchPropertyDetails,
    getConversationMessages,
    analytics
}