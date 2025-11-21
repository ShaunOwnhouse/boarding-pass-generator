/**
 * Boarding Pass Generator Server - HTML Version
 */
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================================================
// 1. STATIC PUBLIC FOLDER
// =======================================================
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
app.use(express.static(publicDir));

// Base URL for links returned to Kore
const BASE_URL = process.env.BASE_URL || "https://boarding-pass-generator.onrender.com";

// =======================================================
// 2. HEALTH CHECK
// =======================================================
app.get("/", (req, res) => {
  res.send("Boarding Pass Generator is Running - HTML Version");
});

// =======================================================
// 3. MAIN ENDPOINT: Generate Boarding Pass HTML
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

    // Validate required fields
    if (!passenger || !flight || !seat) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: passenger, flight, and seat must be provided",
      });
    }

    // Parse route
    const routeParts = route ? route.split(" to ") : ["", ""];
    const routeFromName = routeParts[0] || "";
    const routeToName = routeParts[1] || "";
    
    // Simple airport code extraction (first 3 letters or full name)
    const routeFromCode = routeFromName.substring(0, 3).toUpperCase();
    const routeToCode = routeToName.substring(0, 3).toUpperCase();

    // Parse departure into date and time
    const departureParts = departure ? departure.split(" ") : ["", ""];
    const departureDate = departureParts[0] || "";
    const departureTime = departureParts[1] || "";

    // Generate barcode number from BP number
    const numeric = bpNumber ? bpNumber.replace(/[^0-9]/g, '') : '123456789012';
    const barcodeNumber = numeric.padEnd(12, '0').substring(0, 12);

    // ------------- Load HTML template -------------
    const templatePath = path.join(__dirname, "template.html");
    
    if (!fs.existsSync(templatePath)) {
      console.error("Template NOT found at:", templatePath);
      return res.status(500).json({
        status: "error",
        message: "Template HTML not found on server",
      });
    }

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    // ------------- Replace template variables -------------
    htmlContent = htmlContent
      .replace(/\{\{passenger\}\}/g, passenger || "")
      .replace(/\{\{flight\}\}/g, flight || "")
      .replace(/\{\{airline\}\}/g, airline || "")
      .replace(/\{\{seat\}\}/g, seat || "")
      .replace(/\{\{gate\}\}/g, gate || "")
      .replace(/\{\{terminal\}\}/g, terminal || "")
      .replace(/\{\{bpNumber\}\}/g, bpNumber || "")
      .replace(/\{\{bags\}\}/g, bags || "0")
      .replace(/\{\{route\}\}/g, route || "")
      .replace(/\{\{routeFromCode\}\}/g, routeFromCode)
      .replace(/\{\{routeFromName\}\}/g, routeFromName)
      .replace(/\{\{routeToCode\}\}/g, routeToCode)
      .replace(/\{\{routeToName\}\}/g, routeToName)
      .replace(/\{\{departureDate\}\}/g, departureDate)
      .replace(/\{\{departureTime\}\}/g, departureTime)
      .replace(/\{\{barcodeNumber\}\}/g, barcodeNumber);

    // ------------- Save generated HTML -------------
    const safePassenger = passenger.replace(/\s+/g, "");
    const safeFlight = flight.replace(/\s+/g, "");
    const fileName = `${safeFlight}-${safePassenger}.html`;
    const filePath = path.join(publicDir, fileName);

    console.log("Saving boarding pass to:", filePath);
    fs.writeFileSync(filePath, htmlContent);

    // ------------- Return URL Kore will display -------------
    const imageUrl = `${BASE_URL}/${fileName}`;
    console.log("Boarding Pass URL:", imageUrl);

    res.json({
      status: "success",
      imageUrl,
    });
  } catch (err) {
    console.error("ERROR GENERATING PASS:", err);
    res.status(500).json({
      status: "error",
      message: "Generation failed: " + err.message,
    });
  }
});

// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✈️ Boarding Pass Server running on port ${PORT}`);
});
