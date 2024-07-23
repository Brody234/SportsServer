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
const Affiliate = require('../models/affiliate')

router.post('/join', checkToken, authorizedUser, async(req, res)=>{
    try{
        if(req.user?._id && req.user.affiliateId == null){
            const affcode = await Affiliate.findOne({code: req.body.code})
            if(affcode){
                return res.status(500).json({message: "code in use"})
            }
            const aff = await new Affiliate({
                userId: req.user._id,
                clicks: [],
                code: req.body.code
            })
            const newA = await aff.save();
            req.user.affiliateId = newA._id
            const uUser = await req.user.save()
            return res.status(200).json({user: uUser, affiliate: newA})
        }
        else if(req.user.affiliateId != null){
            return res.status(300).json({message: "You are already a user"})
        }
        else{
            return res.status(404).json({message: "User not found"})
        }
    }
    catch(err){
        return res.status(500).json(err)
    }
})

router.get('/affdata', checkToken, authorizedUser, affiliateFromToken, async (req, res)=>{
    try{
        console.log("here")
        return res.status(200).json({affiliate: req.aff})
    }
    catch(err){
        return res.status(500).json(err)
    }
})

router.patch('/countclick', affiliateFromCode, async (req, res) =>{
    try{
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        console.log(req.aff)
        let clickEntry = req.aff.clicks?.find((click) => {
            return new Date(click.date).toISOString().split('T')[0] === today;
        }) || false;

        if (clickEntry) {
            // Increment the count if entry exists
            clickEntry.count++;
        } else {
            // Add a new entry if it doesn't exist
            console.log(req.aff)
            req.aff.clicks.push({ date: new Date(), count: 1 });
        }
    
        // Save the updated affiliate document
        await req.aff.save();
        return res.status(200).json({})
    }
    catch(err){
        console.log(err)
        return res.status(500).json(err)
    }
})

async function affiliateFromToken(req, res, next){
    console.log('in token')
    if(!req.user.affiliate){
        return res.status(404).json({message: 'You need to become an affiliate to do this.'})
    }
    const aff = await Affiliate.findById(req.user.affiliateId)
    if(!aff){
        return res.status(404).json({message: "Affiliate Data not found."})
    }
    req.aff = aff
    next()
}

async function affiliateFromCode(req, res, next){
    try{
        console.log(req.body.code)
        const aff = await Affiliate.find({code: req.body.code})
        console.log(aff)
        if(!aff){
            console.log('not found')
            return res.status(300).json({})
        }
        req.aff = aff[0]
    }
    catch(err){
        return res.status(500).json(err)
    }
    next()
}

module.exports = router