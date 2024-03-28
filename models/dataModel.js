const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const LinkUsed = new Schema({
  id: String,
  nonce: String,
  used: Boolean,
  discordUid: String,
  createdAt: { type: Date, expires: '1h', default: Date.now }
});

// Compile model from schema
const myDb = mongoose.connection.useDb('Wallet-Address-Verifier')
const LinkUsedModel = myDb.model("LinkUsed", LinkUsed);

const Wallets = new Schema({
  addresses: String,
  discordUid: String,
  username: String,
});

const WalletsModel = myDb.model("Wallets", Wallets);
// const myDb = mongoose.connection.useDb('Link-Shortner')
// const Links = myDb.model('links', createLink)


module.exports = { LinkUsedModel, WalletsModel };
