const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// IMPORTANT: on Render the app folder is read-only. /tmp is writable.
const passesDir = path.join("/tmp", "passes");
if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir, { recursive: true });

// Simple health check
app.get("/", (req, res) => {
  res.send("✅ Boarding Pass Generator is running");
});

app.post("/generate-boarding-pass", async (req, res) => {
  try {
    const data = req.body;

    if (!data.passenger || !data.flight || !data.seat) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // File name like BA6234-JaneDoe.png
    const safeName =
      `${data.flight || "flight"}-` +
      `${(data.passenger || "passenger").replace(/\s+/g, "")}.png`;

    const outputPath = path.join(passesDir, safeName);

    // Load HTML template
    const templatePath = path.join(__dirname, "template.html");
    const template = fs.readFileSync(templatePath, "utf8");

    // Inject data into template (simple string replace)
    const html = template
      .replace(/{{passenger}}/g, data.passenger || "")
      .replace(/{{flight}}/g, data.flight || "")
      .replace(/{{airline}}/g, data.airline || "")
      .replace(/{{route}}/g, data.route || "")
      .replace(/{{seat}}/g, data.seat || "")
      .replace(/{{gate}}/g, data.gate || "")
      .replace(/{{terminal}}/g, data.terminal || "")
      .replace(/{{bpNumber}}/g, data.bpNumber || "")
      .replace(/{{departure}}/g, data.departure || "")
      .replace(/{{bags}}/g, String(data.bags ?? "")); // can be 0

    // Launch headless Chrome
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1400 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Take screenshot
    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();

    const imageUrl = `${req.protocol}://${req.get("host")}/passes/${safeName}`;

    return res.json({
      status: "success",
      imageUrl,
    });
  } catch (err) {
    console.error("Error generating boarding pass:", err);
    return res.status(500).json({ error: "Failed to generate boarding pass" });
  }
});

// Serve generated images
app.use("/passes", express.static(passesDir));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Boarding Pass Server running on port ${PORT}`);
});
