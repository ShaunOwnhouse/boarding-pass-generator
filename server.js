import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const app = express();
app.use(bodyParser.json());

const __dirname = path.resolve();
const PASSES_DIR = path.join(__dirname, "passes");

// Ensure folder exists
if (!fs.existsSync(PASSES_DIR)) {
    fs.mkdirSync(PASSES_DIR);
}

app.post("/generate-boarding-pass", async (req, res) => {
    try {
        const data = req.body;
        console.log("Incoming data:", data);

        const {
            passenger,
            flight,
            airline,
            routeFromCode,
            routeFromName,
            routeToCode,
            routeToName,
            seat,
            gate,
            terminal,
            bpNumber,
            departureDate,
            departureTime,
            bags
        } = data;

        const html = `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    padding: 40px;
                }
                .card {
                    background: #fff;
                    border-radius: 10px;
                    padding: 25px;
                    width: 700px;
                    margin: auto;
                }
                .title { font-size: 22px; font-weight: bold; }
                .label { font-size: 10px; color: #666; }
                .value { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin-top: 20px; }
                .barcode {
                    width: 100%; height: 60px;
                    background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 5px);
                    margin-top: 30px;
                }
            </style>
        </head>
        <body>
        <div class="card">
            <div class="title">${airline}</div>
            <hr>
            <div class="label">Passenger</div>
            <div class="value">${passenger}</div>

            <div class="row">
                <div>
                    <div class="label">From</div>
                    <div class="value">${routeFromCode} (${routeFromName})</div>
                </div>
                <div>
                    <div class="label">To</div>
                    <div class="value">${routeToCode} (${routeToName})</div>
                </div>
            </div>

            <div class="row">
                <div>
                    <div class="label">Flight</div>
                    <div class="value">${flight}</div>
                </div>
                <div>
                    <div class="label">Seat</div>
                    <div class="value">${seat}</div>
                </div>
                <div>
                    <div class="label">Gate</div>
                    <div class="value">${gate}</div>
                </div>
                <div>
                    <div class="label">Terminal</div>
                    <div class="value">${terminal}</div>
                </div>
            </div>

            <div class="row">
                <div>
                    <div class="label">Departure Date</div>
                    <div class="value">${departureDate}</div>
                </div>
                <div>
                    <div class="label">Departure Time</div>
                    <div class="value">${departureTime}</div>
                </div>
            </div>

            <div class="barcode"></div>

            <p style="text-align:center; margin-top:15px;">Boarding Pass: ${bpNumber}</p>
        </div>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const filename = `${flight}-${passenger.replace(/\s/g, "")}.png`;
        const filepath = path.join(PASSES_DIR, filename);

        await page.screenshot({ path: filepath, fullPage: true });
        await browser.close();

        return res.json({
            status: "success",
            imageUrl: `http://boarding-pass-generator.onrender.com/passes/${filename}`
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Serve generated passes
app.use("/passes", express.static(PASSES_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
