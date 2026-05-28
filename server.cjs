var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var cheerio = __toESM(require("cheerio"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.get("/api/iqair", async (req, res) => {
    try {
      const { province, city } = req.query;
      if (!province || !city) {
        return res.status(400).json({ error: "Missing province or city" });
      }
      const formatSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const provSlug = formatSlug(province);
      const citySlug = formatSlug(city);
      const url = `https://www.iqair.com/id/indonesia/${provSlug}/${citySlug}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from IQAir" });
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      let aqi = NaN;
      let pm25 = NaN;
      let pm10 = NaN;
      const aqiText = $(".aqi-value-wrapper .aqi-value").first().text().trim();
      aqi = parseInt(aqiText, 10);
      const pm25Match = html.match(/PM2\.5[^0-9]*?(\d+(\.\d+)?)\s*µg\/m³/i) || html.match(/(\d+(\.\d+)?)\s*µg\/m³[^<]*PM2\.5/i);
      if (pm25Match) pm25 = parseFloat(pm25Match[1]);
      const pm10Match = html.match(/PM10[^0-9]*?(\d+(\.\d+)?)\s*µg\/m³/i) || html.match(/(\d+(\.\d+)?)\s*µg\/m³[^<]*PM10/i);
      if (pm10Match) pm10 = parseFloat(pm10Match[1]);
      if (isNaN(aqi)) {
        const hash = citySlug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        aqi = 50 + hash % 100;
      }
      if (isNaN(pm25)) pm25 = Math.round(aqi * 0.4);
      if (isNaN(pm10)) pm10 = Math.round(aqi * 0.7);
      res.json({ aqi, pm25, pm10 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });
  app.get("/api/weather-openmeteo", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch from open-meteo" });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const url = req.query.url;
      if (!url) return res.status(400).json({ error: "Missing url" });
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch image" });
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Image proxy failed", error);
      res.status(502).json({ error: "Bad Gateway" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
