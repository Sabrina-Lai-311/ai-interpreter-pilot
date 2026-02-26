// pages/api/get-asr-token.js
import Crypto-JS from 'crypto-js'; // 需要执行 npm install crypto-js

export default async function handler(req, res) {
  const appId = process.env.VOLC_APP_ID;
  const accessKey = process.env.VOLC_ACCESS_KEY;
  const secretKey = process.env.VOLC_SECRET_KEY;

  // 这是火山引擎 ASR WebSocket 的标准鉴权逻辑
  // 详情参考：https://www.volcengine.com/docs/6561/79051
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = Crypto-JS.HmacSHA256(
    `appid=${appId}&timestamp=${timestamp}`, 
    secretKey
  ).toString(Crypto-JS.enc.Hex);

  res.status(200).json({
    token: signature,
    timestamp: timestamp,
    appId: appId
  });
}
