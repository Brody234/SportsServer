require('dotenv').config();
const express = require('express');
const router = express.Router();

const jwt = require('../auth/jwt')
const bcrypt = require('../auth/bcrypt');

const bodyParser = require('body-parser');

const checkToken = jwt.authorizeToken
const authorizedUser = jwt.getAuthorizedUser
const createToken = jwt.login

const hashPass = bcrypt.signUp
const checkPass = bcrypt.login

const stripe_key = process.env.STRIPE_API_TEST_KEY
const base_url = process.env.BASE_URL
const monthly_basic = process.env.MONTHLY_BASIC_PRICE
const yearly_basic = process.env.YEARLY_BASIC_PRICE
const webhook_secret = process.env.WEBHOOK_SECRET

const stripe = require("stripe")(stripe_key)

const User = require('../models/user');
const Affiliate = require('../models/affiliate')

router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhook_secret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handlePaymentSucceeded(invoice);
      break;
    case 'charge.refunded':
      const charge = event.data.object;
      await handleRefund(charge);
      break;
    default:
  }

  res.json({ received: true });
});

router.use(express.json())

router.get('/subscribe/monthly', checkToken, authorizedUser, checkSubscriptionMiddleware, ifSubscribedSendError,  async (req, res)=>{
    try{
      let customerId = req.user.stripeCustomerId;
    
      if (!customerId) {
        // Create a new customer in Stripe if the user doesn't have a Stripe customer ID
        const customer = await stripe.customers.create({
          email: req.user.email,
        });
        customerId = customer.id;
  
        // Update the user with the new Stripe customer ID
        req.user.stripeCustomerId = customerId;
        await req.user.save();
      }
  
  
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
      
      if (req.user.stripeCustomerId) {
        sessionParams.customer = req.user.stripeCustomerId;
      } else {
        sessionParams.customer_email = req.user.email;
      }
      
      const session = await stripe.checkout.sessions.create(sessionParams);
      if (!req.user.stripeCustomerId && req.user.stripeCustomerId != "") {
        const retrievedSession = await stripe.checkout.sessions.retrieve(session.id);
        const customerId = retrievedSession.customer;
  
        // Update the user with the new Stripe customer ID
        req.user.stripeCustomerId = customerId;
      }
  

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
      let customerId = req.user.stripeCustomerId;
    
      if (!customerId) {
        // Create a new customer in Stripe if the user doesn't have a Stripe customer ID
        const customer = await stripe.customers.create({
          email: req.user.email,
        });
        customerId = customer.id;
  
        // Update the user with the new Stripe customer ID
        req.user.stripeCustomerId = customerId;
        await req.user.save();
      }
  
  
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
        if (req.user.stripeCustomerId) {
        sessionParams.customer = req.user.stripeCustomerId;
        } else {
        sessionParams.customer_email = req.user.email;
        }
        
        const session = await stripe.checkout.sessions.create(sessionParams);
        if (!req.user.stripeCustomerId && req.user.stripeCustomerId != "") {
          const retrievedSession = await stripe.checkout.sessions.retrieve(session.id);
          const customerId = retrievedSession.customer;
    
          // Update the user with the new Stripe customer ID
          req.user.stripeCustomerId = customerId;
        }
  
        const wait = await req.user.save()
        return res.send({url: session})
    }
    catch(err){
        return res.status(500).json({"message":err.message})
    }
})  


async function handlePaymentSucceeded(invoice) {
  const stripeCustomerId = invoice.customer;
  const amountPaid = invoice.amount_paid / 100;
  try {
    const user = await User.findOne({ stripeCustomerId: stripeCustomerId });

    if (user) {
      const affiliate = await Affiliate.findOne({ code: user.code });

      if (affiliate && affiliate.code == user.code) {
        const commission = amountPaid * affiliate.commissionRate;
        if(affiliate.pendingFunds){
          affiliate.pendingFunds += commission;
        }
        else{
          affiliate.pendingFunds = commission
        }
        const af = await affiliate.save();
      }
    }
  } catch(err) {
  }
}

async function handleRefund(charge) {
  const stripeCustomerId = charge.customer;
  const amountRefunded = charge.amount_refunded / 100;

  try {
    const user = await User.findOne({ stripeCustomerId: stripeCustomerId });
    
    if (user) {
      const affiliate = await Affiliate.findOne({ code: user.code });

      if (affiliate) {
        const commission = amountRefunded * affiliate.commissionRate;
        affiliate.pendingFunds -= commission;
        const af = await Affiliate.updateOne({ _id: affiliate._id }, { $set: { pendingFunds: affiliate.pendingFunds } });
      }
    }
  } finally {
  }
}

async function getCustomerIdByEmail(email, res) {
    try {
        const customers = await stripe.customers.list({
            email: email,
        });
        if (customers.data.length === 0) {
            
        }
        if(customers && customers.data && customers.data[0] && customers.data[0].id){
          return customers.data[0].id
        }
        else{
          return "no data";
        }
    } catch (error) {
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
        console.log('beffore if')
        if(hasValidSubscription && !req.user.subscribed){
          console.log('in if')
          const aff = await Affiliate.findOne({ code: req.user.code });
          console.log("aff")
          console.log(aff)
          if(aff){
            console.log('in aff')
            const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

            const existingSign = aff.signs.find(sign => sign.date === today);

            if (existingSign) {
              existingSign.count += 1;
            } else {
              aff.signs.push({ date: today, count: 1 });
            }

            await aff.save();
          }
        }
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
    if(req.isSubscribed){
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