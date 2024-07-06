const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: false
    },
    stripeCustomerID: {
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
    }
});

module.exports = mongoose.model('User', userSchema);
