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
    code: {
        type: String,
        unique: true
    }
});

module.exports = mongoose.model('Affiliate', affSchema);
