const mongoose = require("mongoose");
const Schema = mongoose.Schema

const PropertySchema = new Schema({
    title: {
        type: String,
    },
    propertyName: {
        type: String,
    },
    address: {
        type: String,
    },
    cityId: {
        type: Schema.Types.ObjectId,
        ref: "City",
    },
    stateId: {
        type: Schema.Types.ObjectId,
        ref: "State",
    },
    zipcode: {
        type: String,
    },
    areaId: {
        type: Schema.Types.ObjectId,
        ref: "Area",
    },
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
    },
    landlordId: {
        type: Schema.Types.ObjectId,
        ref: "Landlord",
    },
    description: {
        type: String,
    },
    basePrice: {
        type: String,
    },
    otherPriceDescription: {
        type: String,
    },
    bedrooms: {
        type: Number,
    },
    bathrooms: {
        type: Number,
    },
    furnishingStatus: {
        type: String,
    },
    availabilityStatus: {
        type: String,
    },
    image: {
        type: String,
    },
    rating: {
        type:String
    },
});

module.exports = mongoose.model('Property', PropertySchema)