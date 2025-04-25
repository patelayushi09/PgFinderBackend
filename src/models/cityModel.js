const mongoose = require("mongoose");
const Schema = mongoose.Schema

const CitySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
        required: true,
    }
}, {
    timestamps: true
})
    ; module.exports = mongoose.model('City', CitySchema)