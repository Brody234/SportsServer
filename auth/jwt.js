require('dotenv').config();
const accessSecret = process.env.ACCESS_TOKEN_SECRET
const jwt = require('jsonwebtoken')
const User = require('../models/user')

module.exports = {
    authorizeToken: function(req, res, next){
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(token == null){
           return res.sendStatus(401)
        }
        jwt.verify(token, accessSecret, (err, user)=>{
            if (err) return res.sendStatus(403)
            req.userA = user

            next()
        })
    },
    getAuthorizedUser: async function(req, res, next){

        try{
            const user = await User.findById(req.userA._id)
            req.user = user
        }
        catch(err){
            res.sendStatus(500)
        }
        next()
    },
    login: async function(req, res, next){
        const user = req.user
        try{
            const userPayload = user.toObject();
            const accessToken = jwt.sign(userPayload, accessSecret);
            req.accessToken = accessToken
            req.user = user
            next()
        }
        catch(err){
            res.status(500).json(err)
        }
        
    }
}