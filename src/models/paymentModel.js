const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  transactionId: {
    type: String
  },
  amount: {
    type: Number
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  receiverName: {
    type: String
  } // For landlord
})

module.exports = mongoose.model("Payment", paymentSchema)