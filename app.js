const { config } = require("dotenv");
config();
const express = require("express");
const app = express();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { Client, Intents } = require("discord.js");
const {
  discordKey,
  googleSheetId,
  dburl,
  httpsPort,
  polyScanApiKey,
  serviceAccEmail,
  serviceAccPkey,
} = require("./config.js");
const { WalletsModel, LinkUsedModel } = require("./models/dataModel.js");

const addWalletAddress = async (discordUid, address, username) => {
  let response;
  try {
    const result = await fetch(
      `https://api.polygonscan.com/api?module=account&action=balance&address=${address}&apikey=${polyScanApiKey}`
    );
    const responseData = await result.json();

    if (responseData.status === "0" && responseData.message === "NOTOK") {
      response = "Invalid wallet address, please check again ❌";
      return response;
    }
  } catch (err) {
    console.log(err);
    return;
  }

  const wallet = await WalletsModel.findOne({ discordUid: discordUid });
  if (!wallet) {
    try {
      const newRegistration = new WalletsModel({
        discordUid,
        addresses: address,
        username,
      });
      try {
        await newRegistration.save();
      } catch (err) {
        response = "could not complete verification, try again later";
        return response;
      }
      response = "Address succesfully Verified.🎉";
      const SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ];

      const jwt = new JWT({
        email: serviceAccEmail,
        key: serviceAccPkey,
        scopes: SCOPES,
      });
      const doc = new GoogleSpreadsheet(googleSheetId, jwt);
      await doc.loadInfo(); // loads document properties and worksheets
      const wallets = await WalletsModel.find();
      const sheet = doc.sheetsByIndex[0];
      for (const instance of wallets) {
        await sheet.addRow({
          Discord_Username: instance.username,
          Wallet_Addresses: instance.addresses,
        });
      }

      return response;
    } catch (err) {
      response = "Could not verify Address❌";
      return response;
    }
  } else if (wallet && wallet.addresses !== null) {
    response = "You already have a verified wallet address❌";
    return response;
  }
  response = "Error";
  return response;
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
          content: "Click to verify your wallet\n",
          components: [verifyButton],
        });
      }
    });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
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
        });
        await interaction.deleteReply();
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content:
              "You did not provide a wallet address.\n click the verify button again",
            ephemeral: true,
          });
        }
      });
    }
  });

  // automatically delete any random message
  client.on("messageCreate", async (message) => {
    const user = message.author;
    const channel = message.channel;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(
        (msg) =>
          msg.author.id === user.id &&
          message.content !== "Click to verify your wallet\n"
      );

      const userMessages2 = messages.map((msg) => msg.author.id === user.id);

      await Promise.all(userMessages.map((msg) => msg.delete()));
    } catch (error) {
      console.error("Failed to delete messages:", error);
      message.reply("Failed to delete messages.");
    }
  });

  client.login(discordKey);
})();
