const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: false
    },
    stripeCustomerId: {
        type: String,
        default: ""
    },
    iagreetotos:{
        type: Boolean,
        default: false
    },
    subscribed: {
        type: Boolean,
        default: false
    },
    affiliateId: {
        type: mongoose.Schema.ObjectId || null,
        default: null
    },
    code: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('User', userSchema);
