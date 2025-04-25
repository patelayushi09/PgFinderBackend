// const express = require("express");
// const http = require("http");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const { Server } = require("socket.io");
// const Razorpay = require("razorpay");
// require("dotenv").config();

// const port = process.env.PORT || 5000;


// const app = express();
// const server = http.createServer(app);

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// //  Connect to MongoDB
// async function main() {
//     await mongoose.connect(process.env.MONGO_URI, {
//         serverSelectionTimeoutMS: 10000 // Timeout after 10 seconds
//     });
// }
// main().then(() => console.log(" MongoDB connected successfully!"))
//     .catch(err => console.log(" MongoDB Connection Error:", err));

// //  Initialize Socket.IO
// const io = new Server(server, {
//     cors: {
//         origin: "*", //  Update to match frontend
//         methods: ["GET", "POST"],
//     },
// });

// //  Handle Socket.io Connections
// let onlineUsers = [];

// io.on("connection", (socket) => {
//     console.log(` New client connected: ${socket.id}`);

//     // Add new user to online list
//     socket.on("addNewUser", ({ userId, userType }) => {
//         onlineUsers = onlineUsers.filter(user => user.userId !== userId); // Remove old entry
//         onlineUsers.push({ userId, userType, socketId: socket.id });

//         console.log(" Online users:", onlineUsers);
//         io.emit("getOnlineUsers", onlineUsers); // Broadcast updated users
//     });

//     //  Handle message sending
//     socket.on("sendMessage", (message) => {
//         console.log(" New message received:", message);

//         const recipient = onlineUsers.find(user => user.userId === message.receiverId);
//         if (recipient) {
//             io.to(recipient.socketId).emit("getMessage", message);
//             io.to(recipient.socketId).emit("getNotification", {
//                 senderId: message.senderId,
//                 senderType: message.senderType,
//                 receiverId: message.receiverId,
//                 propertyId: message.propertyId,
//                 isRead: false,
//                 date: new Date(),
//             });
//         }
//     });

//     //  Handle user disconnect
//     socket.on("disconnect", () => {
//         console.log(` User disconnected: ${socket.id}`);
//         onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
//         io.emit("getOnlineUsers", onlineUsers);
//     });
// });

// // Define API Routes
// app.get("/", (req, res) => {
//     res.send("PG_FINDER server is running...");
// });

// //razorpay
// app.post("/orders", async (req, res) => {
//     //console.log("Incoming order data:", req.body); //debug
//     try {
//       const { amount, currency } = req.body;
  
//       if (!amount || !currency) {
//         return res.status(400).json({ error: "Amount and currency are required" });
//       }
  
//       const razorpay = new Razorpay({
//         key_id: process.env.RAZORPAY_KEY_ID,
//         key_secret: process.env.RAZORPAY_KEY_SECRET,
//       });
  
//       const options = {
//         amount: Math.round(req.body.amount),
//         currency: req.body.currency,
//         receipt: `receipt_order_${Date.now()}`,
//         payment_capture: 1,
//       };
      
  
//       const order = await razorpay.orders.create(options);
  
//       res.json({
//         order_id: order.id,
//         currency: order.currency,
//         amount: order.amount,
//       });
//     } catch (error) {
//       console.error("Razorpay Order Creation Error:", error); // Add this to see actual error
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });

// app.get("/payment/:paymentId",async(req,res)=>{
//     const { paymentId } = req.params;  
//     const razorpay = new Razorpay({
//         key_id: process.env.RAZORPAY_KEY_ID,
//         key_secret: process.env.RAZORPAY_KEY_SECRET
//     })

//     try {
//         const payment = await razorpay.payments.fetch(paymentId);  // using correct ID
//         if (!payment) {
//             return res.status(404).json({ error: "Payment not found" });
//         }

//         res.json({
//             status: payment.status,
//             currency: payment.currency,
//             amount: payment.amount,
//             method: payment.method
//         });
//     } catch (error) {
//         console.error("Error fetching payment:", error);
//         res.status(500).json({ error: "Failed to fetch payment", details: error.message });
//     }
// })



// //  Import & use routes
// app.use("/admin", require("./src/routes/adminRoutes"));
// app.use("/landlord", require("./src/routes/landlordRoutes"));
// app.use("/tenant", require("./src/routes/tenantRoutes"));
// app.use("/state", require("./src/routes/stateRoutes"));
// app.use("/city", require("./src/routes/cityRoutes"));
// app.use("/area", require("./src/routes/areaRoutes"));
// app.use("/message", require("./src/routes/messageRoutes"));

// // Start the merged Express + Socket.IO server
// server.listen(port, () => {
//     console.log(` PG_FINDER running on port ${port}`);
// });


const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const Razorpay = require("razorpay");
require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

// ✅ CORS Setup — allow frontend origin
const allowedOrigins = [
  "https://pg-finder-frontend-zeta.vercel.app",
  "http://localhost:5173",
  "https://pg-finder-frontend-vjxi.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.options("*", cors()); // ✅ Preflight response for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });
}
main()
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("addNewUser", ({ userId, userType }) => {
    onlineUsers = onlineUsers.filter(user => user.userId !== userId);
    onlineUsers.push({ userId, userType, socketId: socket.id });

    console.log("🟢 Online users:", onlineUsers);
    io.emit("getOnlineUsers", onlineUsers);
  });

  socket.on("sendMessage", (message) => {
    console.log("✉️ New message received:", message);
    const recipient = onlineUsers.find(user => user.userId === message.receiverId);
    if (recipient) {
      io.to(recipient.socketId).emit("getMessage", message);
      io.to(recipient.socketId).emit("getNotification", {
        senderId: message.senderId,
        senderType: message.senderType,
        receiverId: message.receiverId,
        propertyId: message.propertyId,
        isRead: false,
        date: new Date()
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

// Home Route
app.get("/", (req, res) => {
  res.send("🏠 PG_FINDER server is running...");
});

// Razorpay Routes
app.post("/orders", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ error: "Amount and currency are required" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: Math.round(amount),
      currency,
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order_id: order.id,
      currency: order.currency,
      amount: order.amount
    });
  } catch (error) {
    console.error("❌ Razorpay Order Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/payment/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      status: payment.status,
      currency: payment.currency,
      amount: payment.amount,
      method: payment.method
    });
  } catch (error) {
    console.error("❌ Razorpay Payment Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch payment", details: error.message });
  }
});

// API Routes
app.use("/admin", require("./src/routes/adminRoutes"));
app.use("/landlord", require("./src/routes/landlordRoutes"));
app.use("/tenant", require("./src/routes/tenantRoutes"));
app.use("/state", require("./src/routes/stateRoutes"));
app.use("/city", require("./src/routes/cityRoutes"));
app.use("/area", require("./src/routes/areaRoutes"));
app.use("/message", require("./src/routes/messageRoutes"));

// Start Server
server.listen(port, () => {
  console.log(`🚀 PG_FINDER running on port ${port}`);
});
