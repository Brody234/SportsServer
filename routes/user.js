const express = require('express');
const router = express.Router();

const jwt = require('../auth/jwt')
const bcrypt = require('../auth/bcrypt');

const checkToken = jwt.authorizeToken
const authorizedUser = jwt.getAuthorizedUser
const createToken = jwt.login

const hashPass = bcrypt.signUp
const checkPass = bcrypt.login

const User = require('../models/user')

router.post('/new', hashPass, createUser, createToken, async(req, res)=>{
    try{
        res.status(200).json({
            "user": req.user,
            "token": req.accessToken
        })
    }
    catch(err){
        res.status(500).send(err)
    }
})

router.post('/login', findUser, checkPass, createToken, async (req, res)=>{
    try{
        res.status(200).json({
            "user": req.user,
            "token": req.accessToken
        })
    }
    catch(err){
        res.status(500).send(err)
    }
})

async function findUser(req, res, next){
    const logname = req.body.logname;

    try {
        const user = await User.findOne({ $or: [{ email: logname }] });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
}

async function createUser(req, res, next){
    const email = req.body.email
    const password = req.hashPass
    const phoneNumber = req.body.phoneNumber || ""
    const stripeCustomerID = req.body.stripeCustomerID || ""
    const iagreetotos = req.body.iagreetotos
    try{
        if(email == null){
            res.status(403).json({"message": "Remember to enter a valid email."})
        }
        else{
            const newUser = await new User({
                email: email,
                password: password,
                phoneNumber: phoneNumber,
                stripeCustomerID: stripeCustomerID,
                iagreetotos: iagreetotos
            });

            const user = await newUser.save();
            req.user = user

            next()
        }
    }
    catch(err){
        res.status(500).json(err)
    }
}

module.exports = router