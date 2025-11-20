const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(bodyParser.json());
app.use("/passes", express.static(path.join(__dirname, "passes")));

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
      bags
    } = req.body;

    const [departureDate, departureTime] = departure.split(" ");

    let template = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");

    template = template
      .replace(/{{passenger}}/g, passenger)
      .replace(/{{flight}}/g, flight)
      .replace(/{{airline}}/g, airline)
      .replace(/{{route}}/g, route)
      .replace(/{{seat}}/g, seat)
      .replace(/{{gate}}/g, gate)
      .replace(/{{terminal}}/g, terminal)
      .replace(/{{bpNumber}}/g, bpNumber)
      .replace(/{{departureDate}}/g, departureDate)
      .replace(/{{departureTime}}/g, departureTime)
      .replace(/{{bags}}/g, bags);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(template, { waitUntil: "load" });

    const fileName = `${flight}-${passenger.replace(/\s/g, "")}.png`;
    const filePath = path.join(__dirname, "passes", fileName);

    await page.screenshot({ path: filePath, fullPage: true });
    await browser.close();

    res.json({
      status: "success",
      imageUrl: `https://boarding-pass-generator.onrender.com/passes/${fileName}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Boarding Pass Generator API is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
