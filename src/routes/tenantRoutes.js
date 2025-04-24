const express = require("express")
const router = express.Router()

const tenantController = require('../controllers/tenantController')
const { authenticateToken } = require("../utils/utilities")

router.post("/signup",tenantController.tenantSignup)
router.post("/login",tenantController.tenantLogin)

router.post("/send-otp", tenantController.sendOTP)
router.post("/resend-otp",tenantController.sendOTP)
router.post("/forgot-password/otp", tenantController.validateOTP)
router.post("/change-password", tenantController.changePassword)

router.get("/properties",tenantController.getProperty)

router.get("/favorites/:tenantId",tenantController.getFavorites)
router.post("/favorites", tenantController.addFavorite);
router.delete("/favorites/:tenantId/:propertyId", tenantController.removeFavorite)

router.post("/bookings", authenticateToken("tenant"), tenantController.createBooking);
router.get("/bookings/:tenantId", tenantController.getBookingsByTenant);
router.put("/bookings/:bookingId", tenantController.updateBookingStatus);
router.delete("/bookings/:bookingId", tenantController.deleteBooking);


router.get("/dashboard/:tenantId",authenticateToken("tenant"),tenantController.getTenantDashboard)


router.get("/:tenantId", authenticateToken("tenant"), tenantController.getTenantById)
router.put("/:tenantId", authenticateToken("tenant"), tenantController.updateTenant)

router.post("/contact",tenantController.sendContactMessage)

router.post("/payment/verify",tenantController.verifyPayment)
module.exports = router