const Message = require("../models/messageModel")
const Tenant = require("../models/tenantModel")
const Landlord = require("../models/landlordModel")
const Property = require("../models/propertyModel")

// Helper function to get conversation details
const getConversationDetails = async (messages, tenantId, landlordId, propertyId) => {
  try {
    const [tenant, landlord, property] = await Promise.all([
      Tenant.findById(tenantId),
      Landlord.findById(landlordId),
      Property.findById(propertyId),
    ])

    // Get the last message
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

    // Count unread messages for tenant
    const unreadForTenant = messages.filter(
      (msg) => msg.receiverId.toString() === tenantId.toString() && !msg.read,
    ).length


    // Count unread messages for landlord
    const unreadForLandlord = messages.filter(
      (msg) => msg.receiverId.toString() === landlordId.toString() && !msg.read,
    ).length


    return {
      _id: propertyId,
      participants: {
        tenant: {
          _id: tenant._id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          profileImage: tenant.profileImage,
        },
        landlord: {
          _id: landlord._id,
          name: landlord.name,
          profileImage: landlord.profileImage,
        },
      },
      property: {
        _id: property._id,
        name: property.name,
      },
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
          }
        : null,
        unreadCount: tenantId.toString() === messages[0]?.senderId.toString() ? unreadForTenant : unreadForLandlord,
    }
  } catch (error) {
    console.error("Error getting conversation details:", error)
    throw error
  }
}

// Get all conversations for a tenant
exports.getTenantConversations = async (req, res) => {
  try {
    const tenantId = req.params.tenantId

    // Find all messages where the tenant is either sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: tenantId, senderType: "tenant" },
        { receiverId: tenantId, receiverType: "tenant" },
      ],
    }).sort({ createdAt: -1 })

    // Group messages by property and landlord
    const conversationMap = {}

    for (const message of messages) {
      const propertyId = message.propertyId.toString()
      const landlordId = message.senderType === "landlord" ? message.senderId : message.receiverId

      const key = `${propertyId}_${landlordId}`

      if (!conversationMap[key]) {
        conversationMap[key] = {
          propertyId,
          landlordId,
          messages: [],
        }
      }

      conversationMap[key].messages.push(message)
    }

    // Get detailed conversation info
    const conversations = await Promise.all(
      Object.values(conversationMap).map(async (conv) => {
        return await getConversationDetails(conv.messages, tenantId, conv.landlordId, conv.propertyId)
      }),
    )

    res.status(200).json({
      error: false,
      data: conversations,
    })
  } catch (error) {
    console.error("Error getting tenant conversations:", error)
    res.status(500).json({
      error: true,
      message: "Failed to get conversations",
    })
  }
}

// Get all conversations for a landlord
exports.getLandlordConversations = async (req, res) => {
  try {
    const landlordId = req.params.landlordId

    // Find all messages where the landlord is either sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: landlordId, senderType: "landlord" },
        { receiverId: landlordId, receiverType: "landlord" },
      ],
    }).sort({ createdAt: -1 })

    // Group messages by property and tenant
    const conversationMap = {}

    for (const message of messages) {
      const propertyId = message.propertyId.toString()
      const tenantId = message.senderType === "tenant" ? message.senderId : message.receiverId

      const key = `${propertyId}_${tenantId}`

      if (!conversationMap[key]) {
        conversationMap[key] = {
          propertyId,
          tenantId,
          messages: [],
        }
      }

      conversationMap[key].messages.push(message)
    }

    // Get detailed conversation info
    const conversations = await Promise.all(
      Object.values(conversationMap).map(async (conv) => {
        return await getConversationDetails(conv.messages, conv.tenantId, landlordId, conv.propertyId)
      }),
    )

    res.status(200).json({
      error: false,
      data: conversations,
    })
  } catch (error) {
    console.error("Error getting landlord conversations:", error)
    res.status(500).json({
      error: true,
      message: "Failed to get conversations",
    })
  }
}

// Get messages for a specific conversation
exports.getConversationMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId

    const messages = await Message.find({
      propertyId: conversationId,
    }).sort({ createdAt: 1 })

    res.status(200).json({
      error: false,
      data: messages,
    })
  } catch (error) {
    console.error("Error getting conversation messages:", error)
    res.status(500).json({
      error: true,
      message: "Failed to get messages",
    })
  }
}

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { senderId, receiverId, senderType, receiverType, content, propertyId } = req.body

    const newMessage = new Message({
      senderId,
      receiverId,
      senderType,
      receiverType,
      content,
      propertyId,
      read: false,
      createdAt: new Date(),
    })

    const savedMessage = await newMessage.save()

    res.status(201).json({
      error: false,
      data: savedMessage,
      message: "Message sent successfully",
    })
  } catch (error) {
    console.error("Error creating message:", error)
    res.status(500).json({
      error: true,
      message: "Failed to send message",
    })
  }
}

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId, userId, userType } = req.body

    // Update all messages where user is the receiver and messages are unread
    const result =await Message.updateMany(
      {
        propertyId: conversationId,
        receiverId: userId,
        receiverType: userType,
        read: false,
      },
      {
        $set: { read: true },
      },
    )

    res.status(200).json({
      error: false,
      message: "Messages marked as read",
      updatedCount: result.modifiedCount || result.nModified || 0,

    })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    res.status(500).json({
      error: true,
      message: "Failed to mark messages as read",
    })
  }
}



    
      
    
