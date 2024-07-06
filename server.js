require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const User = require("./models/user")
const DataTracker = require("./models/requestsimplifier")
const port = process.env.PORT;
const nodeEnv = process.env.NODE_ENV;
const url = process.env.DATABASE_URL;


mongoose.connect(url)
  .then(() => {
    console.log('Connected to MongoDB');
    
    initializeRequestHandlers();
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error);
  });
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log("connected to database"));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, origin);
    },
    credentials: true, 
    exposedHeaders: ['Access-Control-Allow-Credentials'],
}));

app.use(express.json()); 


const userRoute = require('./routes/user');
app.use('/user', userRoute);

const arbitrageRouter = require('./routes/arbitrage')
app.use('/arbitrage', arbitrageRouter)

app.listen(port, () => console.log('server has started'));

async function initializeRequestHandlers() {
    let regions = ['us', 'uk', 'eu', 'au'];
    try {
      for (const region of regions) {
        const existingHandler = await DataTracker.findOne({ region });
  
        if (!existingHandler) {
          const newHandler = new DataTracker({
            region,
          });
  
          await newHandler.save();
          console.log(`RequestHandler created for region: ${region}`, newHandler);
        } else {
          console.log(`RequestHandler already exists for region: ${region}`, existingHandler);
        }
      }
    } catch (error) {
      console.error('Error initializing RequestHandlers:', error);
    }
  }