require('dotenv').config();
const accessSecret = process.env.ACCESS_TOKEN_SECRET
const bcrypt = require('bcrypt')
const User = require('../models/user')

module.exports = {
    signUp: async function(req, res, next){
        if(!req.body.newPassword || req.body.newPassword == ""){
            res.status(403).json({"message":"Password not found"})
        }
        else{
            try{
                const hashPass = await bcrypt.hash(req.body.newPassword, 10)
                req.hashPass = hashPass
            }
            catch(err){
                res.status(500).json(err)
            }
            next()
        }
    },
    login: async function(req, res, next){
        const user = req.user
        const password = req.body.password
        try{
            if(await bcrypt.compare(password, user.password)){
                next()
            }
            else{
                res.status(401).json({message: "Wrong Password"})
            }
        }
        catch(err){
            res.status(500).send(err)
        }
    }
}