const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const WebSocket = require('ws');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const TAOSTATS_API_BASE = 'https://api.taostats.io';

app.use(cors());
app.use(express.json()); 


app.use(async (req, res) => {
  try {
    const path = req.originalUrl;
    console.log(path)

    //can be RPC or can be HTTPS call
    if (path.includes("rpc")) {
      //websocket
      if (path.includes("lite")){
          wsUrl = `wss://api.taostats.io/api/v1/rpc/ws/finney_lite?authorization=${process.env.TAOSTATS_API_KEY}`;
      }else{
          wsUrl = `wss://api.taostats.io/api/v1/rpc/ws/finney_archive?authorization=${process.env.TAOSTATS_API_KEY}`;
      }
      
      
      //WSS call
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        console.log('WebSocket connected. Sending payload...');
        ws.send(JSON.stringify(req.body)); // Forward client request body
      });

      ws.on('message', (msg) => {
        console.log('Received response from WS:', msg.toString());
        res.json(JSON.parse(msg.toString())); // Send WS response back to client
        ws.close();
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        res.status(500).json({ error: 'WebSocket connection failed' });
      });

      ws.on('close', () => console.log('WebSocket closed.'));
    } else {
      //http
      url = `${TAOSTATS_API_BASE}${path}`;
      console.log(url)
      const response = await axios.get(url, {
        headers: {
          'Authorization': process.env.TAOSTATS_API_KEY
        }
      });
      res.status(response.status).json(response.data);
    }

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
