// import fs from "fs";
const { config } = require("dotenv");
config();
const express = require("express");
const app = express();
// import cors from "cors";
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { Client, Intents } = require("discord.js");
const { discordKey, isDev, dburl, httpsPort, url } = require("./config.js");
const { WalletsModel, LinkUsedModel } = require("./models/dataModel.js");

key = "387b92702efe847bedad27c6a9fc9055e30dcb0af9e3bbe3e5de6b638a5d6aa";
AppId = "1214627587460956220";
let credentials;
credentials = {};
let count = 0;
let determinant = ''

// if (isDev) {
//   credentials.key = fs.readFileSync("./sslcert/cert.key", "utf8");
//   credentials.cert = fs.readFileSync("./sslcert/cert.pem", "utf8");
// } else {
//   credentials.key = fs.readFileSync(
//     "/etc/letsencrypt/live/discord-bot.floomby.us/privkey.pem",
//     "utf8"
//   );
//   credentials.cert = fs.readFileSync(
//     "/etc/letsencrypt/live/discord-bot.floomby.us/cert.pem",
//     "utf8"
//   );
//   credentials.ca = fs.readFileSync(
//     "/etc/letsencrypt/live/discord-bot.floomby.us/chain.pem",
//     "utf8"
//   );
// }

const addWalletAddress = async (discordUid, address, username) => {
  try {
    await WalletsModel.findOneAndUpdate(
        { discordUid },
        { $push: { addresses: address }, $set: { username: username } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const response = 'Address succesfully Verified.🎉' ;
    return response;
} catch (error) {
    if (error.code === 11000) {
        const response = 'Address Verified Before.❌' ;
        return response;
    }
    throw error;
}
};




const createLink = async (discordUid) => {
  const id = uuidv4();
  await new LinkUsedModel({
    id,
    used: false,
    discordUid,
  }).save();
  return id;
};

(async () => {
  mongoose
    .connect(dburl)
    .then(() => {
      console.log("connected to database!");
    })
    .catch(() => {
      console.log("connection failed!");
    });


    // app.get("/verify", async (req, res) => {
    //   const locks = new Map();
    //   const lockKey = req.query.id;
    //   if (locks.get('queryId')) {
    //     res.send({ locked: true });
    //     return;
    //   }
    
    //   locks.set('queryId', lockKey);
    //   console.log(locks);
    //   try {
    //     const doc = await LinkUsedModel.findOneAndUpdate(
    //       { id: req.query.id, used: false },
    //       { $set: { used: true } }
    //     );
    //     const address = req.query.address;
    //     const username = req.query.username;
    //     const discordId = req.query.discordID;

    
    //     // const ret = await addWalletAddress(discordId, address, username);
    
    //     // res.send(ret);
    //     res.send({message: "ok"})
    //   } catch (err) {
    //     res.send({ invalid: true });
    //     console.error(err);
    //   } finally {
    //     locks.delete(lockKey);
    //   }
    // });
    

  app.listen(httpsPort, () => {
    console.log(`now listening on port ${httpsPort}`);
  });

  const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  });

  client.once("ready", () => {
    console.log("bot is running!");

    client.guilds.cache.forEach(async (guild) => {
      const channel = guild.channels.cache.find(
        (channel) => channel.type === "GUILD_TEXT" && channel.name === "verify"
      );

      if (!channel) return;

      const verifyButton = {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: "Verify",
            custom_id: "verify",
          },
        ],
      };

      const message = await channel.messages.fetch();
      if (message.size === 0) {
        await channel.send({
          content: "Click to verify your wallet\n nn",
          components: [verifyButton],
        });
      }
    });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

  });


  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    let dbResponse = ''
    const { customId } = interaction;

    if (customId === "verify") {
      await interaction.reply({
        content:
          "Please enter your wallet address:\n (action expires in 1 min).",
        ephemeral: true,
      });

      const filter = (response) => response.author.id === interaction.user.id;

      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (msg) => {
        console.log("Wallet address received:", msg.content); 
        collector.stop();
        const id = msg.author.id;
        await interaction.followUp({
          content: `Verification in process, please wait...`,
          ephemeral: true,
        });
        await interaction.followUp({
          content: await addWalletAddress(id, msg.content, msg.author.username),
          ephemeral: true,
        })
      });
      // await interaction.reply({
      //   content: dbResponse,
      //   ephemeral: true,
      // });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content: "You did not provide a wallet address.\n click the verify button again",
            ephemeral: true,
          });
        }
      });
    }
  });


  // automatically delete any random message
  client.on("messageCreate", async (message) => {

      const user = message.author; // You can change this to the user you want to delete messages from
      const channel = message.channel;
      
  
      try {
        const messages = await channel.messages.fetch({ limit: 100 }); // Fetch the last 100 messages in the channel
        const userMessages = messages.filter((msg) => msg.author.id === user.id);
  
        await Promise.all(userMessages.map((msg) => msg.delete())); // Delete all messages by the user
  
      } catch (error) {
        console.error("Failed to delete messages:", error);
        message.reply("Failed to delete messages.");
      }

  });
  


  client.login(discordKey);
})();
