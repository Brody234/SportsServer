const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestSimplifier = new Schema({
    opportunities: 
        [{
            game: {
                type: String
                // Name of game ie Steelers vs Patriots
            },
            bet: {
                type: Boolean
            },
            profit: {
                type: Number
                // ex: .0543 = 5.43% profit
            },
            betCount: {
                type: Number,
                // ex 2 means make two bets
            },
            found: {
                type: Date
            },
            matchStart: {
                type: Date
            },
            bets:[{
                number: {
                    type: Number,
                    // an ennumeration of what bet this is in the count, index + 1 essentially
                },
                site: {
                    type: String,
                    // bookmaker site ie draftkings.com
                },
                side: {
                    type: String,
                    // teams like Stealers, Over 2.5, etc
                },
                odds: {
                    type: Number,
                    // american odds for something
                },
                type: {
                    type: String,
                    // example head to head, over under, make human readable
                },
                share: {
                    type: Number,
                    // percent of total money in the thing ie .54 = 54% of money goes to this
                }
            }]
        }]
    ,
    mostRecentCall: {
        type: Date,
        required: true,
        default: new Date().setDate(new Date().getDate() - 14)
    },
    sports: [{
        type: String
    }],
    mostRecentSportsCall: {
        type: Date,
        required: true,
        default: new Date().setDate(new Date().getDate() - 14)
    },
    region: {
        type: String,
        enum: ['us', 'uk', 'eu', 'au'],
        required: true
      },
});

module.exports = mongoose.model('DataTracker', requestSimplifier);
