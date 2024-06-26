const express = require("express");
const app = express();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const { Client, Intents } = require("discord.js");
const data = require("./config.json");
const {
  discordApiKey,
  googleSheetsDocId,
  httpsPort,
  polyScanApiKey,
  googleServiceAccEmail,
  googleServiceAccPkey,
} = data;

const addWalletAddress = async (discordUid, address, username) => {
  let response;
  //this sends a post request to the polygonscan api to check if the wallet address the user submits is valid
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
    response = "Could not verify wallet address, try again";
    return response;
  }

  //this functionality setups a connection between a googlesheet document and the code

  //these scopes defines the permissions that the program has on the google sheet, which are 'read' and 'write'
  try {
    const SCOPES = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ];

    //A JSON WEB TOKEN is created using the credentials from the GOOGLE SPREADSHEET API APP SERVICE ACCOUNT AUTHENTICATION.
    const jwt = new JWT({
      email: googleServiceAccEmail,
      key: googleServiceAccPkey,
      scopes: SCOPES,
    });

    const doc = new GoogleSpreadsheet(googleSheetsDocId, jwt); //this creates a local instance of the already created googlesheet doc, using the sheet ID
    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    if (rows.length === 0) {
      //checks if the sheet is empty and then appends the wallet address and the username of the user
      const moreRows = await sheet.addRow({
        Discord_Username: username,
        Wallet_Addresses: address,
        Discord_Id: discordUid,
      });

      response = "Address succesfully Verified.🎉";
      return response;
    } else {
      for (const row of rows) {
        if (row.get("Discord_Id") === discordUid) {
          // if sheet is not empty but the user already has a verified wallet address, the sheet isn't updated
          response = "You already have a verified Wallet Address ❌";
          return response;
        } else {
          // if sheet is not empty and the user doesn't have a verified address, sheet is updated.
          await sheet.addRow({
            Discord_Username: username,
            Wallet_Addresses: address,
            Discord_Id: discordUid,
          });
          response = "Address succesfully Verified.🎉";
          return response;
        }
      }
    }
  } catch (err) {
    console.log(err.message);
    response = "Could not verify Address❌";
    return response;
  }
};

//CONNECT TO LOCALPORT + DISCORDAPI
(async () => {
  app.listen(httpsPort, () => {
    console.log(`now listening on port ${httpsPort}`);
  });

  const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  });

  client.once("ready", () => {
    console.log("bot is running!");

    //this creates a verify button in a channel with the name 'verify' where the channel is also a text channel
   
  });

  //this runs whenever the button is clicked, to begin an interaction
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

  // automatically delete any message sent to the verification channel for privacy
  client.on("messageCreate", async (message) => {
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

    const channel = message.channel;

    //the channel.id is the id of the verification channel and the guildId is the server id.
    if (
      (channel.id === "1192420646563631204" &&
        channel.guildId === "943987429981966387") ||
      (channel.id === "1224711848553746493" &&
        channel.guildId === "923671926633820201")
    ) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(
          (msg) => msg.content !== "Click to verify your wallet"
        );

        const defaultMessages = messages.filter((msg) => {
          return msg.content === "Click to verify your wallet";
        });

        if (userMessages.size >= 1) {
          if (
            message.content.startsWith("verify!") &&
            defaultMessages.size < 1
          ) {
            console.log("s");
            await channel.send({
              content: "Click to verify your wallet\n",
              components: [verifyButton],
            });
            return;
          }
        }

        await Promise.all(userMessages.map((msg) => msg.delete()));
      } catch (error) {
        return;
      }
    }
  });

  //connect to discord api using your key
  client.login(discordApiKey);
})();
