const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Render writable directory
const passesDir = path.join("/tmp", "passes");
if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir, { recursive: true });

// Health check
app.get("/", (req, res) => {
  res.send("✅ Boarding Pass Generator is running");
});

// Generate boarding pass
app.post("/generate-boarding-pass", async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.passenger || !data.flight || !data.seat) {
      return res.status(400).json({
        error:
          "Missing required fields: passenger, flight, and seat must be provided",
      });
    }

    // ==========================
    // FORMAT & CLEAN INPUT DATA
    // ==========================

    // Split route: "Johannesburg to London"
    const [routeFromName, routeToName] = (data.route || "").split(" to ");

    const routeFromCode = routeFromName
      ? routeFromName.substring(0, 3).toUpperCase()
      : "";
    const routeToCode = routeToName
      ? routeToName.substring(0, 3).toUpperCase()
      : "";

    // Split departure datetime: "2025-11-20 18:45"
    const [departureDate, departureTime] = (data.departure || "").split(" ");

    // Generate safe filename
    const safeName =
      `${data.flight || "flight"}-` +
      `${(data.passenger || "passenger").replace(/\s+/g, "")}.png`;

    const outputPath = path.join(passesDir, safeName);

    // Load HTML template
    const templatePath = path.join(__dirname, "template.html");
    const template = fs.readFileSync(templatePath, "utf8");

    // ==========================
    // REPLACE TEMPLATE VARIABLES
    // ==========================
    const html = template
      .replace(/{{passenger}}/g, data.passenger || "")
      .replace(/{{airline}}/g, data.airline || "")
      .replace(/{{flight}}/g, data.flight || "")
      .replace(/{{gate}}/g, data.gate || "")
      .replace(/{{terminal}}/g, data.terminal || "")
      .replace(/{{seat}}/g, data.seat || "")
      .replace(/{{bags}}/g, String(data.bags ?? ""))
      .replace(/{{bpNumber}}/g, data.bpNumber || "")
      .replace(/{{routeFromName}}/g, routeFromName || "")
      .replace(/{{routeToName}}/g, routeToName || "")
      .replace(/{{routeFromCode}}/g, routeFromCode || "")
      .replace(/{{routeToCode}}/g, routeToCode || "")
      .replace(/{{departureDate}}/g, departureDate || "")
      .replace(/{{departureTime}}/g, departureTime || "");

    // ==========================
    // LAUNCH CHROMIUM (Render)
    // ==========================
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1400 });

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Screenshot to PNG
    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();

    // Public image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/passes/${safeName}`;

    return res.json({
      status: "success",
      imageUrl,
    });
  } catch (err) {
    console.error("❌ Error generating boarding pass:", err);
    return res.status(500).json({
      error: "Failed to generate boarding pass",
      details: err.message,
    });
  }
});

// Serve generated PNG images
app.use("/passes", express.static(passesDir));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Boarding Pass Server running on port ${PORT}`);
});
