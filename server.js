const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

// ---- Airline Logo Mapping ----
const airlineLogos = {
    "British Airways": "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/British_Airways_Logo.svg/512px-British_Airways_Logo.svg.png",
    "South African Airways": "https://upload.wikimedia.org/wikipedia/commons/4/43/South_African_Airways_Logo.svg",
    "Mango Airlines": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Mango_Airlines_logo.svg/2560px-Mango_Airlines_logo.svg.png",
    "FlySafair": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/FlySafair_Logo.svg/2560px-FlySafair_Logo.svg.png",
    "Emirates": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Emirates_logo.svg/2560px-Emirates_logo.svg.png"
};

// Static route for saved passes
app.use("/passes", express.static(path.join(__dirname, "passes")));

app.post("/generate-boarding-pass", async (req, res) => {
    try {
        const data = req.body;

        // pick airline logo
        const airlineLogo = airlineLogos[data.airline] || airlineLogos["South African Airways"];

        // ensure directory exists
        if (!fs.existsSync("passes")) fs.mkdirSync("passes");

        // Load template
        let html = fs.readFileSync("template.html", "utf8");

        // Insert values
        html = html
            .replace(/{{airline}}/g, data.airline)
            .replace(/{{airlineLogo}}/g, airlineLogo)
            .replace(/{{passenger}}/g, data.passenger)
            .replace(/{{flight}}/g, data.flight)
            .replace(/{{routeFromCode}}/g, data.routeFromCode || "")
            .replace(/{{routeToCode}}/g, data.routeToCode || "")
            .replace(/{{routeFromName}}/g, data.routeFromName || "")
            .replace(/{{routeToName}}/g, data.routeToName || "")
            .replace(/{{departureDate}}/g, data.departureDate)
            .replace(/{{departureTime}}/g, data.departureTime)
            .replace(/{{gate}}/g, data.gate)
            .replace(/{{seat}}/g, data.seat)
            .replace(/{{terminal}}/g, data.terminal)
            .replace(/{{bpNumber}}/g, data.bpNumber)
            .replace(/{{bags}}/g, data.bags);

        // Puppeteer launch
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const fileName = `${data.flight}-${data.passenger.replace(/\s+/g, "")}.png`;
        const filePath = path.join("passes", fileName);

        await page.screenshot({
            path: filePath,
            fullPage: true
        });

        await browser.close();

        res.json({
            status: "success",
            imageUrl: `http://boarding-pass-generator.onrender.com/passes/${fileName}`
        });

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.get("/", (req, res) => {
    res.send("Boarding Pass Generator Running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
