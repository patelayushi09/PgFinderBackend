const express = require("express")
const router = express.Router()

const messageController = require('../controllers/messageController')


// Get all conversations for a tenant
router.get("/tenant/:tenantId/conversations", messageController.getTenantConversations)

// Get all conversations for a landlord
router.get("/landlord/:landlordId/conversations", messageController.getLandlordConversations)

// Get messages for a specific conversation
router.get("/conversations/:conversationId", messageController.getConversationMessages)

// Create a new message
router.post("/", messageController.createMessage)

// Mark messages as read
router.put("/read", messageController.markMessagesAsRead)

module.exports = router
