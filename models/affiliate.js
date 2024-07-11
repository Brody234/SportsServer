const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const affSchema = new Schema({
    userId: {
        type: mongoose.Schema.ObjectId
    },
    clicks: [{
        date: {
            type: Date
        },
        count: {
            type: Number
        }
    }],
    signs: [{
        date: {
            type: Date
        },
        count: {
            type: Number
        }
    }],
    code: {
        type: String,
        unique: true
    },
    commissionRate:{
        type: Number,
        default: .33
    },
    pendingFunds: {
        type: Number
    }
});

module.exports = mongoose.model('Affiliate', affSchema);
