const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/", (req, res) => {
  res.send("✅ Boarding Pass Generator is running");
});

// MAIN API — Generates Base64 Boarding Pass
app.post("/generate-boarding-pass", async (req, res) => {
  try {
    const data = req.body;

    // Basic validation
    const required = ["passenger", "flight", "seat"];
    for (let field of required) {
      if (!data[field]) {
        return res.status(400).json({
          error: `Missing required field: ${field}`
        });
      }
    }

    // Load template.html
    const templatePath = path.join(__dirname, "template.html");
    let html = fs.readFileSync(templatePath, "utf8");

    // Replace all template variables
    html = html
      .replace(/{{passenger}}/g, data.passenger)
      .replace(/{{flight}}/g, data.flight)
      .replace(/{{airline}}/g, data.airline || "")
      .replace(/{{routeFromCode}}/g, data.routeFromCode || "")
      .replace(/{{routeFromName}}/g, data.routeFromName || "")
      .replace(/{{routeToCode}}/g, data.routeToCode || "")
      .replace(/{{routeToName}}/g, data.routeToName || "")
      .replace(/{{seat}}/g, data.seat)
      .replace(/{{gate}}/g, data.gate || "")
      .replace(/{{terminal}}/g, data.terminal || "")
      .replace(/{{departureDate}}/g, data.departureDate || "")
      .replace(/{{departureTime}}/g, data.departureTime || "")
      .replace(/{{bpNumber}}/g, data.bpNumber || "")
      .replace(/{{bags}}/g, data.bags || 0);

    // Launch Headless Chromium (Render-compatible)
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: chromium.headless,
      defaultViewport: { width: 900, height: 1400 }
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Screenshot as buffer (NOT saving to disk)
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    await browser.close();

    // Return Base64 to Kore.ai
    return res.json({
      status: "success",
      imageBase64: screenshotBuffer.toString("base64")
    });

  } catch (err) {
    console.error("❌ Error generating boarding pass:", err);
    return res.status(500).json({
      error: "Failed to generate boarding pass",
      details: err.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Boarding Pass Server running on port ${PORT}`);
});
