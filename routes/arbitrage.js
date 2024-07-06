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
const Data = require('../models/requestsimplifier')


const key = "87b9c63f58cc921b86d3c5301ac1146a"

/*

const opportunities = [{
    game: "Patriots vs Steelers",
    profit: 0.0543,
    betCount: 2,
    bet1:{
        number: 1,
        site: "draftkings.com",
        side: "Steelers",
        odds: "-400",
        type: "Head to head",
        share: .53
    },
    bet2: {
        number: 2,
        site: "bet365.com",
        side: "Patriots",
        odds: "+648",
        type: "Head to head",
        share: .47
    }
},
{
    game: "Celtics vs Lakers",
    profit: 0.0543,
    betCount: 2,
    bet1:{
        number: 1,
        site: "draftkings.com",
        side: "Steelers",
        odds: "-400",
        type: "Head to head",
        share: .53
    },
    bet2: {
        number: 2,
        site: "bet365.com",
        side: "Patriots",
        odds: "+648",
        type: "Head to head",
        share: .47
    }
}]
*/

router.get('/:region', checkToken, authorizedUser, checkSubscription, async (req, res)=>{
    const region = req.params.region;
    if(region == 'us' || region == 'eu' || region == 'uk' || region == 'au'){
        try{
            const data = await Data.find({region: region})
            req.datalogged = data[0]
        }
        catch (err){ 
            return res.status(500).send()
        }
        if (req.datalogged && req.datalogged.mostRecentCall) {
            const mostRecentCall = new Date(req.datalogged.mostRecentCall);
            const currentTime = new Date();
            const twoMinutesInMilliseconds = 2 * 60 * 1000;
            
            if (currentTime - mostRecentCall <= twoMinutesInMilliseconds) {
                return res.status(200).json({opportunities: req.datalogged.opportunities});
            }
        }

        if (req.datalogged && req.datalogged.mostRecentSportsCall){
            const mostRecentCall = new Date(req.datalogged.mostRecentCall);
            const currentTime = new Date();
            const twentyfourHoursInMilliseconds = 24 * 60 * 60 * 1000;

            if(currentTime - mostRecentCall >= twentyfourHoursInMilliseconds){
                try{
                    const sports = await callSports(region);
                    req.datalogged.mostRecentSportsCall = new Date()
                    req.datalogged.sports = sports
                    const newLog = await req.datalogged.save()
                }
                catch(err){
                    res.status(500).json(err).send()
                }
            }
        }
        const bestKeys = {
            markets: ["h2h", "total"],
            sports: req.datalogged.sports
        }
        const allarbed = []
        const skipped = false
        for(let i = 0; i < 12; i++){
                const sport = bestKeys.sports[Math.floor(bestKeys.sports.length*Math.random())]
                const market = bestKeys.markets[Math.floor(bestKeys.markets.length*Math.random())]

            try{
                const data = await find(region, sport, market)
                console.log(data)
                if(!data && !skipped){
                    i--
                    continue
                }
                const arbed = arbitrate(data, market)
                console.log(arbed)
                console.log("ALL ARBED")
                allarbed.push(...arbed)
                console.log(allarbed)
                if(i > 4 && allarbed.some(item => item.profit > 0.03)){
                    req.datalogged.opportunities.push(...allarbed)
                    console.log("----")
                    console.log(req.datalogged.opportunities)
                    const tenMinutesInMilliseconds = 10 * 60 * 1000; 
                    const currentTime = Date.now(); 

                    const opps = req.datalogged.opportunities.filter((val) => {
                        const foundTime = new Date(val.found).getTime(); 
                        return currentTime - foundTime <= tenMinutesInMilliseconds; 
                    });
                    try{
                        req.datalogged.opportunities = opps
                        req.datalogged.mostRecentCall = currentTime
                        req.datalogged.save()
                        return res.status(200).json({opportunities: opps}).send()
                    }
                    catch(err){
                        return res.status(500).json(err).send()
                    }
                }
                if(i > 10){
                    req.datalogged.opportunities.push(...allarbed)
                    console.log("----")

                    console.log(req.datalogged.opportunities)
                    const tenMinutesInMilliseconds = 20 * 60 * 1000; 
                    const currentTime = Date.now(); 

                    const opps = req.datalogged.opportunities.filter((val) => {
                        const foundTime = new Date(val.found).getTime(); 
                        return currentTime - foundTime <= tenMinutesInMilliseconds; 
                    });
                    try{
                        console.log("----")
                        console.log(opps)
                        req.datalogged.opportunities = opps
                        req.datalogged.mostRecentCall = currentTime
                        req.datalogged.save()
                        return res.status(200).json({opportunities: opps}).send()
                    }
                    catch(err){
                        return res.status(500).json(err).send()
                    }
                }
            }
            catch(err){

            }

        }
    }
    else{
        res.status(500).send()
    }
})

async function find(region, sport, market) {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${key}&regions=${region}&markets=${market}`;
    const response = await fetch(url);
    console.log(response) 
    if (!response.ok) {
        return false
    }

    const data = await response.json();
    return data
}
function arbitrate(oddsData, market){
    const strategies = []
    for(let i = 0; i < oddsData.length; i++){
        const games = oddsData[i]
        games.bookmakers.map((valA, ia)=>{
            games.bookmakers.map((valB, ib)=>{
                if(valA.markets[0].outcomes.length == 2 || valB.markets[0].outcomes.length == 2){
                    if(valA.markets[0].outcomes[0].price && valB.markets[0].outcomes[1].price && (market != 'totals' || valA.markets[0].outcomes[0].point == valB.markets[0].outcomes[1].point)){
                        const strategy = decimalToStrategy(valA.markets[0].outcomes[0].price, valB.markets[0].outcomes[1].price)
                        if(strategy.bet){
                            const object  = {
                                game: games.home_team + " vs " + games.away_team,
                                bet: strategy.bet,
                                betCount: 2,
                                profit: strategy.payout,
                                found: new Date(),
                                matchStart: new Date(games.commence_time),
                                bets:[
                                    {
                                        number: 1,
                                        site: valA.key,
                                        side: valA.markets?.[0]?.outcomes?.[0]
                                        ? valA.markets[0].outcomes[0].name + " " + (valA.markets[0].outcomes[0].point || "")
                                        : "Default Value",
                                        odds: valA.markets[0].outcomes[0].price,
                                        type: market,
                                        share: strategy.A
                                    },
                                    {
                                        number: 2, 
                                        site: valB.key,
                                        side: valB.markets?.[0]?.outcomes?.[1]
                                        ? valB.markets[0].outcomes[1].name + " " + (valB.markets[0].outcomes[1].point || "")
                                        : "Default Value",
                                        odds: valB.markets[0].outcomes[1].price,
                                        type: market,
                                        share: strategy.B
                                    }  
                                ]
                            }
                            console.log(object)
                            strategies.push(object)
                        }
                    }
                }
            })
        })
    }
    return strategies
}

async function checkSubscription(req, res, next){
    if(req.user.subscribed){
        next()
    }
    else{
        try{
            res.status(403).send()
        }
        catch(err){
            res.status(500).json(err).send()
        }
    }
}

async function callSports(region){
    const url = `https://api.the-odds-api.com/v4/sports/?apiKey=${key}`;
    try{
        const response = await fetch(url);
        const data = await response.json()
        const keys = data.map((val, i)=>{
            return val.key
        })
        return keys
    }
    catch(err){
        return res.status(500).json(err).send()
    }
    
}

function decimalToStrategy (decimalA, decimalB) {
    const probabilityA = decimalToProbability(decimalA)
    const probabilityB = decimalToProbability(decimalB)
    const opportunity = oddsToOpportunity(probabilityA, probabilityB)
    if(opportunity >= 1){
        return {A: 0, B: 0, bet: false, payout: 0}
    }
    const payout = ((1/opportunity))-1
    const a = (probabilityA/opportunity)
    const b = (probabilityB/opportunity)
    console.log("opportunity found")
    return {A: a, B: b, bet: true, payout: payout}
}

function decimalToProbability (decimal) {
    const prob = 1/decimal
    return prob
}

function oddsToOpportunity (oddsA, oddsB) {
    const opportunity = oddsA + oddsB
    return opportunity
}

module.exports = router