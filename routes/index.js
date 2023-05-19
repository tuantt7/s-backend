var express = require("express");
var router = express.Router();
require("dotenv").config();
const abiDecoder = require("abi-decoder");
const axios = require("axios");
var cors = require("cors");
router.use(cors());
const { web3Api } = require("../web3");

router.use(function (req, res, next) {
  const accept = [
    "http://localhost:5173",
    "http://172.16.110.226:5173",
    "https://thanhtuan.onrender.com",
  ];
  const origin = req.headers.origin;
  const authorised = accept.includes(origin);
  if (!authorised) {
    return res.status(403).send(origin + "Unauthorised!");
  } else {
    next();
  }
});

router.post("/abi", async function (req, res, next) {
  const contract = req.body.contract;
  const hx = req.body.hx;
  const net = req.body.net;
  const network =
    net === "sepolia" ? process.env.SEPOLIA_URL : process.env.MAINNET_URL;
  console.log(network);

  const response = await axios.get(
    `${network}/api?module=contract&action=getabi&address=${contract}&apikey=${process.env.SEPOLIA_SCAN_KEY}`
  );
  if (response.data.status == 0 && response.data.message == "NOTOK") {
    res.send(response.data);
    return;
  }
  const abi = JSON.parse(response.data.result);
  abiDecoder.addABI(abi);
  const decodedData = abiDecoder.decodeMethod(hx) || {};
  if (decodedData && decodedData.name) decodedData.status = 1;
  res.send({ decodedData, abi });
});

router.get("/transaction", async function (req, res, next) {
  const web3 = web3Api(req.query.net);
  try {
    const response = await web3.eth.getTransaction(req.query.id);
    const receipt = await web3.eth.getTransactionReceipt(req.query.id);
    const block = await web3.eth.getBlock(response.blockNumber);
    response.timestamp = block.timestamp;
    let isContract = false;
    if (response.to) {
      const code = await web3.eth.getCode(response.to);
      isContract = code !== "0x";
    }
    response.isContract = isContract;
    res.status(200).send({ response, receipt });
  } catch (error) {
    console.log(error);
    res.status(200).send(error);
  }
});

module.exports = router;
