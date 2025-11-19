const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Writable directory on Render
const passesDir = path.join("/tmp", "passes");
if (!fs.existsSync(passesDir)) fs.mkdirSync(passesDir, { recursive: true });

/* ---------------------------------------------------
   HEALTH CHECK
--------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("✅ Boarding Pass Generator is running");
});

app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Boarding Pass Generator Running ✔️"
  });
});

/* ---------------------------------------------------
   CORE LOGIC: GENERATE BOARDING PASS (Reusable Function)
--------------------------------------------------- */
async function generatePass(data, req) {
  if (!data.passenger || !data.flight || !data.seat) {
    throw new Error("Missing required fields");
  }

  // File name -> BA6234-JaneDoe.png
  const safeName =
    `${data.flight || "flight"}-` +
    `${(data.passenger || "passenger").replace(/\s+/g, "")}.png`;

  const outputPath = path.join(passesDir, safeName);

  // Load template
  const templatePath = path.join(__dirname, "template.html");
  const template = fs.readFileSync(templatePath, "utf8");

  // Inject data into template
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
    .replace(/{{bags}}/g, String(data.bags ?? ""));

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1400 });
  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();

  const imageUrl = `${req.protocol}://${req.get("host")}/passes/${safeName}`;
  return imageUrl;
}

/* ---------------------------------------------------
   POST VERSION  (Kore.ai will use this)
--------------------------------------------------- */
app.post("/generate-boarding-pass", async (req, res) => {
  try {
    const imageUrl = await generatePass(req.body, req);
    res.json({ status: "success", imageUrl });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------
   GET VERSION  (for browser testing)
--------------------------------------------------- */
app.get("/generate", async (req, res) => {
  try {
    const data = {
      passenger: req.query.passenger,
      flight: req.query.flight,
      seat: req.query.seat,
      gate: req.query.gate,
      terminal: req.query.terminal,
      route: req.query.route,
      airline: req.query.airline,
      bpNumber: req.query.bpNumber,
      departure: req.query.departure,
      bags: req.query.bags
    };

    const imageUrl = await generatePass(data, req);
    res.json({ status: "success", imageUrl });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------
   SERVE GENERATED IMAGES
--------------------------------------------------- */
app.use("/passes", express.static(passesDir));

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Boarding Pass Server running on port ${PORT}`);
});
