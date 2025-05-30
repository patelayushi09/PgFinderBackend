const mongoose = require("mongoose");
const Schema = mongoose.Schema

const OtpSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpires: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Otp', OtpSchema)