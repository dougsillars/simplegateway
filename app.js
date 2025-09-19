const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const { ApiPromise, WsProvider } = require("@polkadot/api");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const TAOSTATS_API_BASE = "https://api.taostats.io";

app.use(cors());
app.use(express.json());

const apis = {}; // cache ApiPromise connections keyed by wsUrl

async function getApi(wsUrl) {
  if (apis[wsUrl]) return apis[wsUrl];
  console.log(`Connecting to ${wsUrl}...`);
  const provider = new WsProvider(wsUrl);
  const api = await ApiPromise.create({ provider });
  apis[wsUrl] = api;
  return api;
}

// Helper to choose wsUrl based on network
function chooseWsUrl(network) {
  if (network === "lite") {
    return `wss://api.taostats.io/api/v1/rpc/ws/finney_lite?authorization=${process.env.TAOSTATS_API_KEY}`;
  }
  return `wss://api.taostats.io/api/v1/rpc/ws/finney_archive?authorization=${process.env.TAOSTATS_API_KEY}`;
}

// --------------------
// 1️⃣ List modules + storage functions
// --------------------
app.get("/api/rpc/list", async (req, res) => {
  try {
    const wsUrl = chooseWsUrl(req.query.network);
    const api = await getApi(wsUrl);

    const result = {};
    Object.keys(api.query).forEach((moduleName) => {
      result[moduleName] = Object.keys(api.query[moduleName]);
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// 2️⃣ Query a storage function
// --------------------
app.post("/api/rpc/query", async (req, res) => {
  try {
    const { module, storage_function, params, network } = req.body;
    if (!module || !storage_function) {
      return res.status(400).json({ error: "Missing module or storage_function" });
    }

    const wsUrl = chooseWsUrl(network);
    const api = await getApi(wsUrl);

    if (!api.query[module] || !api.query[module][storage_function]) {
      return res.status(400).json({ error: "Invalid module or storage_function" });
    }

    const value = await api.query[module][storage_function](...(params || []));
    res.json({ value: value.toHuman() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// 3️⃣ Generic HTTP proxy
// --------------------
app.use("/api/http", async (req, res) => {
  try {
    const url = `${TAOSTATS_API_BASE}${req.originalUrl.replace("/api/http", "")}`;
    console.log("Proxying HTTP GET:", url);
    const response = await axios.get(url, {
      headers: { Authorization: process.env.TAOSTATS_API_KEY }
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error(err);
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
