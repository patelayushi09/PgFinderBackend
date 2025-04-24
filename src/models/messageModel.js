const mongoose = require("mongoose");
const Schema = mongoose.Schema

const MessageSchema = new Schema({
    senderId: {
        type: String,
        required: true,
      },
      receiverId: {
        type: String,
        required: true,
      },
      senderType: {
        type: String,
        enum: ["tenant", "landlord"],
        required: true,
      },
      receiverType: {
        type: String,
        enum: ["tenant", "landlord"],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
      read: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
});

// Add indexes for faster queries
MessageSchema.index({ senderId: 1, receiverId: 1 })
MessageSchema.index({ propertyId: 1 })
MessageSchema.index({ createdAt: -1 })
module.exports = mongoose.model('Message', MessageSchema)


