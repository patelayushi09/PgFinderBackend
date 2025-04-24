const mongoose = require("mongoose");
const Schema = mongoose.Schema

const FavoriteSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
    },
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: "Property",        
    },
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Favorite', FavoriteSchema)