import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Serve passes folder
app.use('/passes', express.static(path.join(__dirname, 'passes')));

// Generate boarding pass endpoint
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

        // Split date/time
        const [departureDate, departureTime] = departure.split(" ");

        // Load HTML template
        let template = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");

        // Replace placeholders
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

        // Launch puppeteer
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(template, { waitUntil: "load" });

        // Path
        const fileName = `${flight}-${passenger.replace(/\s/g, "")}.png`;
        const filePath = path.join(__dirname, "passes", fileName);

        // Generate image
        await page.screenshot({ path: filePath, fullPage: true });

        await browser.close();

        return res.json({
            status: "success",
            imageUrl: `http://boarding-pass-generator.onrender.com/passes/${fileName}`
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: err.message });
    }
});

// Root message
app.get("/", (req, res) => {
    res.send("Boarding Pass Generator API is running.");
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
