import WebSocket from 'ws';
import axios from 'axios';
import express from 'express';

const app = express();
const port = 3000;

const exchanges = [
    { name: 'Binance', url: 'wss://stream.binance.com:9443/ws/btcusdt@depth' },
    // { name: 'Kraken', url: 'wss://ws.kraken.com' }, // Replace with Kraken WebSocket URL
    // { name: 'Huobi', url: 'wss://api.huobi.pro/ws' } // Replace with Huobi WebSocket URL
  ];

const orderBooks: Record<string, { bids: number[]; asks: number[] }> = {};

exchanges.forEach((exchange) => {
  const ws = new WebSocket(exchange.url);

  ws.on('open', () => {
    console.log(`${exchange.name} WebSocket connected`);
    if (exchange.name === 'Binance') {
      const payload = JSON.stringify({ method: 'SUBSCRIBE', params: ['btcusdt@depth'], id: 1 });
      ws.send(payload);
    } else if (exchange.name === 'Kraken') {
      const payload = JSON.stringify({ event: 'subscribe', pair: ['XBT/USD'], subscription: { name: 'book' } });
      ws.send(payload);
    } else if (exchange.name === 'Huobi') {
      const payload = JSON.stringify({ sub: 'market.btchusdt.depth.step0', id: 'id1' });
      ws.send(payload);
    }
  });
  ws.on('message', (data: WebSocket.Data) => {

    const orderBookData = JSON.parse(data.toString());
    if (exchange.name === 'Binance' && orderBookData.e === 'depthUpdate') {
        const bids = orderBookData.b.map((entry: number[]) => [entry[0], entry[1]]);
        const asks = orderBookData.a.map((entry: number[]) => [entry[0], entry[1]]);
        orderBooks[exchange.name] = { bids, asks };
    } else if (exchange.name === 'Kraken') {
        console.log(`${exchange.name} ${orderBookData}`);
        // Process Kraken data
    } else if (exchange.name === 'Huobi' && orderBookData.ch === 'market.btchusdt.depth.step0') {
      // Process Huobi data
      console.log(`${exchange.name} ${orderBookData}`);
    }
  });
  

  ws.on('error', (error) => {
    console.error(`${exchange.name} WebSocket error:`, error);
  });

  ws.on('close', () => {
    console.log(`${exchange.name} WebSocket closed`);
  });
});

let averageMidPrice = 0;

setInterval(() => {
  const midPrices: number[] = [];

  exchanges.forEach((exchange) => {
    const orderBook = orderBooks[exchange.name];
    console.log(`${exchange.name} setInterval`);
    if (orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      const bids = orderBook.bids.map((entry) => parseFloat(entry.toString().split(',')[0]));
      const asks = orderBook.asks.map((entry) => parseFloat(entry.toString().split(',')[0]));
      console.log(`bids : ${bids} | asks: ${asks} \n`);

      if (bids.length > 0 && asks.length > 0) {
        const highestBid = Math.max(...bids);
        const lowestAsk = Math.min(...asks);
           console.log(`bids : ${highestBid} | asks: ${lowestAsk} \n`);

        const midPrice = (highestBid + lowestAsk) / 2;
        midPrices.push(midPrice);
      }
    }
  });
  
  
  averageMidPrice = midPrices.reduce((sum, midPrice) => sum + midPrice, 0) / midPrices.length;

  console.log('Average Mid-Price:', averageMidPrice);
}, 60000);

app.get('/global-price-index', (req, res) => {
  res.json({ averageMidPrice });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
