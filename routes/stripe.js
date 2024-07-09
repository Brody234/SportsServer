require('dotenv').config();
const express = require('express');
const router = express.Router();

const jwt = require('../auth/jwt')
const bcrypt = require('../auth/bcrypt');

const checkToken = jwt.authorizeToken
const authorizedUser = jwt.getAuthorizedUser
const createToken = jwt.login

const hashPass = bcrypt.signUp
const checkPass = bcrypt.login

const stripe_key = process.env.STRIPE_API_TEST_KEY
const base_url = process.env.BASE_URL
const monthly_basic = process.env.MONTHLY_BASIC_PRICE
const yearly_basic = process.env.YEARLY_BASIC_PRICE

const stripe = require("stripe")(stripe_key)

const User = require('../models/user')

router.get('/subscribe/monthly', checkToken, authorizedUser, checkSubscriptionMiddleware, ifSubscribedSendError,  async (req, res)=>{
    try{
      const sessionParams = {
        payment_method_types: ['card'],
        mode: 'subscription',
        success_url: `${base_url}?checksession=true`,
        cancel_url: `${base_url}#join`,
        line_items: [
          {
            price: `${monthly_basic}`,
            quantity: 1,
          },
        ],
        metadata: {
          sub: "Basic"
        }
      };
      
      if (req.user.stripeCustomerID) {
        sessionParams.customer = req.user.stripeCustomerID;
      } else {
        sessionParams.customer_email = req.user.email;
      }
      
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      const wait = await req.user.save()
      return res.send({url: session})
    }
    catch(err){
      return res.status(500).json({"message":err.message})
    }
})  

router.get('/check', checkToken, authorizedUser, checkSubscriptionMiddleware, ifSubscribedSendError, async (req, res)=>{
    try{
        res.status(200).json({user: req.user})
    }
    catch(err){
        res.status(500).json(err)
    }
})

router.get('/subscribe/yearly', checkToken, authorizedUser, checkSubscriptionMiddleware, ifSubscribedSendError,  async (req, res)=>{
    try{
        const sessionParams = {
        payment_method_types: ['card'],
        mode: 'subscription',
        success_url: `${base_url}?checksession=true`,
        cancel_url: `${base_url}#join`,
        line_items: [
            {
            price: `${yearly_basic}`,
            quantity: 1,
            },
        ],
        metadata: {
            sub: "Basic"
        }
        };
        console.log(sessionParams)
        if (req.user.stripeCustomerID) {
        sessionParams.customer = req.user.stripeCustomerID;
        } else {
        sessionParams.customer_email = req.user.email;
        }
        
        const session = await stripe.checkout.sessions.create(sessionParams);
        console.log(session)
        const wait = await req.user.save()
        return res.send({url: session})
    }
    catch(err){
        return res.status(500).json({"message":err.message})
    }
})  

async function getCustomerIdByEmail(email, res) {
    try {
        const customers = await stripe.customers.list({
            email: email,
        });
        console.log(customers)
        if (customers.data.length === 0) {
            
        }
        if(customers && customers.data && customers.data[0] && customers.data[0].id){
          console.log('ehre')
          return customers.data[0].id
        }
        else{
          console.log('asfdjlk')
          return "no data";
        }
    } catch (error) {
        console.log('erroring')
        res.status(500).json(error)
        return 'done'
    }
}

async function checkSubscriptionStatus(customerId, res) {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
        });
        const validSubscription = subscriptions.data.some(subscription => 
            (subscription.status === 'active' || subscription.status === 'trialing') &&
            subscription.items.data.some(item => 
                item.price.id === yearly_basic || item.price.id === monthly_basic
            )
        );
        return validSubscription;
    } catch (error) {
        res.status(500).json(error)
        return 'done'
    }
}


async function checkSubscriptionMiddleware(req, res, next) {
    try {
        const { email, stripeCustomerId, _id: userId } = req.user;
  
        let customerId = stripeCustomerId;
        
        if (!customerId) {
            if (!email) {
                req.isSubscribed = false;
                return next();
            }
            customerId = await getCustomerIdByEmail(email, res);
            console.log(customerId)
            if(customerId == 'done'){
              return
            }
            if(customerId == 'no data'){
              req.isSubscribed = false;
              next()

              return
            }
            // Save the Stripe customer ID to the user record
            req.user.stripeCustomerId = customerId;
            
            
        }
        const hasValidSubscription = await checkSubscriptionStatus(customerId, res);
        if(hasValidSubscription == 'done'){
          return
        }
        req.isSubscribed = hasValidSubscription;
        req.user.subscribed = hasValidSubscription
        const newU = await req.user.save()
        next();
    } catch (error) {
        console.error('Error in subscription middleware:', error);
        req.isSubscribed = false;
        next();
    }
}
  
  async function ifSubscribedSendError(req, res, next){
    console.log('here45')
    if(req.isSubscribed){
      console.log('here56')
      console.log(req.user)
      return res.status(200).json({alreadySubscribed: true, user: req.user})
    }
    else{
      next()
    }
  }
  
  
  async function ifNotSubscribedSendError(req, res, next){
    if(!req.isSubscribed){
      return res.status(200).json({notSubscribed: true})
    }
    else{
      next()
    }
  }
    

module.exports = router