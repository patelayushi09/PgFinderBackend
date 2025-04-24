const express = require("express")
const router = express.Router()

const adminController = require('../controllers/adminController')
const { authenticateToken } = require("../utils/utilities")

router.post("/login", adminController.adminLogin)

router.post("/send-otp", adminController.sendOTP)
router.post("/resend-otp",adminController.sendOTP)
router.post("/forgot-password/otp", adminController.validateOTP)
router.post("/change-password", adminController.changePassword)


router.get("/users",adminController.getUsers)
router.delete("/users/:id",adminController.deleteUser)
router.put("/users/:id",adminController.updateUser)
router.get("/users/:id",adminController.getUserById)
router.post("/users",adminController.addUser)


router.get("/properties",adminController.getProperties)
router.delete("/properties/:id",adminController.deleteProperty)
router.put("/properties/:id",adminController.updateProperty)
router.get("/properties/:id",adminController.getPropertyById)
router.post("/properties",authenticateToken("admin"),adminController.addProperty)

router.get("/landlords", adminController.getLandlords);

router.get("/dashboard", adminController.getAdminDashboard)


router.get("/conversations",adminController.getAllConversations)
router.get("/conversation-stats",adminController.getConversationStats)
router.get("/fetch-property",adminController.fetchPropertyDetails)

router.post("/conversations/:conversationId", adminController.getConversationMessages)

router.get("/analytics",adminController.analytics)
module.exports = router





