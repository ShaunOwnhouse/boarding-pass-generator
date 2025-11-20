/**
 * Boarding Pass Generator Server
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================================================
// 1. STATIC PUBLIC FOLDER
// =======================================================
const publicDir = path.join(__dirname, "public");
const passesDir = path.join(publicDir, "passes");
const templateDir = path.join(__dirname, "template");

// Ensure /public and /public/passes exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir);

app.use(express.static(publicDir));

// Base URL for links returned to Kore
const BASE_URL =
  process.env.BASE_URL || "https://boarding-pass-generator.onrender.com";

// =======================================================
// 2. HEALTH CHECK
// =======================================================
app.get("/", (req, res) => {
  res.send("Boarding Pass Generator is Running");
});

// =======================================================
// 3. MAIN ENDPOINT: Generate Boarding Pass
// =======================================================
app.post("/generate-boarding-pass", async (req, res) => {
  try {
    const {
      passenger,
      flight,
      airline,
      route,
      seat,
      gate,
      terminal,
      bpNumber,
      departure,
      bags,
    } = req.body;

    console.log("Incoming payload:", req.body);

    // ------------- Load template image -------------
    const templatePath = path.join(
      templateDir,
      "boarding-pass-template.png"
    );

    if (!fs.existsSync(templatePath)) {
      console.error("Template NOT found at:", templatePath);
      return res.status(500).json({
        status: "error",
        message: "Template image not found on server",
      });
    }

    const image = await Jimp.read(templatePath);

    // ------------- Load font -------------
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    // ------------- Write text onto image -------------
    image.print(font, 30, 40, `Passenger: ${passenger}`);
    image.print(font, 30, 70, `Flight: ${flight}`);
    image.print(font, 30, 100, `Seat: ${seat}`);
    image.print(font, 30, 130, `Gate: ${gate}`);
    image.print(font, 30, 160, `Terminal: ${terminal}`);
    image.print(font, 30, 190, `Boarding Pass: ${bpNumber}`);
    image.print(font, 30, 220, `Departure: ${departure}`);
    image.print(font, 30, 250, `Bags: ${bags}`);

    // ------------- Build safe file name -------------
    const safePassenger = passenger.replace(/\s+/g, "");
    const safeFlight = flight.replace(/\s+/g, "");

    const fileName = `${safeFlight}-${safePassenger}.png`;
    const filePath = path.join(passesDir, fileName);

    console.log("Saving boarding pass to:", filePath);

    // ------------- Write PNG file -------------
    await image.writeAsync(filePath);

    // ------------- Return URL Kore will display -------------
    const imageUrl = `${BASE_URL}/passes/${fileName}`;

    console.log("Boarding Pass URL:", imageUrl);

    res.json({
      status: "success",
      imageUrl,
    });

  } catch (err) {
    console.error("ERROR GENERATING PASS:", err);
    res.status(500).json({
      status: "error",
      message: "Generation failed",
    });
  }
});

// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✈ Boarding Pass Server running on port ${PORT}`)
);
