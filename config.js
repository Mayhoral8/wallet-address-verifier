const {config} = require("dotenv");
config()
 const discordKey = `${process.env.DISCORD_KEY}`;
 const dburl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xoq86dz.mongodb.net/?retryWrites=true&w=majority`;
 const httpsPort = 5000;
 const url = "https://verify-wallet-address.onrender.com/verify"

 module.exports = {discordKey, dburl, httpsPort, url}