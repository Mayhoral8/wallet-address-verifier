
const {config} = require("dotenv");
const cred = require('./psychic-outcome-418515-147d5a8ee272.json')
config()
 const discordApiKey = `${process.env.DISCORD_KEY}`;
 const dburl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xoq86dz.mongodb.net/?retryWrites=true&w=majority`;
 const httpsPort = 5000;
 const url = "https://verify-wallet-address.onrender.com"
 const polyScanApiKey = process.env.POLYGONSCAN_API_KEY
 const googleSheetsDocId = process.env.GOOGLE_SHEETS_ID
 const googleServiceAccPkey = cred.private_key
 const googleServiceAccEmail = cred.client_email

 module.exports = {discordApiKey, dburl, httpsPort, url, polyScanApiKey, googleSheetsDocId, googleServiceAccEmail, googleServiceAccPkey}