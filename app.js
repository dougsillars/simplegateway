const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const TAOSTATS_API_BASE = 'https://api.taostats.io';

app.use(cors());
app.use(async (req, res) => {


  try {
    const path = req.originalUrl;
    console.log(path)
    if (path.includes("rpc")) {
      url = `${TAOSTATS_API_BASE}${path}?authorization=${process.env.TAOSTATS_API_KEY}`;
      console.log(`${TAOSTATS_API_BASE}${path}?authorization=apikey`)
    } else {
      url = `${TAOSTATS_API_BASE}${path}`;
      console.log(url)
    }
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': process.env.TAOSTATS_API_KEY
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error forwarding request:', error.message);

    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data || 'Error from upstream API'
      });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
