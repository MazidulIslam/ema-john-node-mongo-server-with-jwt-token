const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
// const { initializeApp } = require("firebase-admin/app");
var admin = require("firebase-admin");
// from firebase privatekey for jwt token verify
const { MongoClient } = require("mongodb");
const port = process.env.PORT || 5000;

// firebase admin initializeApp

var serviceAccount = require("./ema-john-simple-683b6-firebase-adminsdk-qhzgn-7088f60b38.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nu4vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.uid;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("online_Shop");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");

    // GET PRODUCTS API
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }

      res.send({
        count,
        products,
      });
    });

    // use POST API to get data by keys for cart
    app.post("/products/bykeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    // Get Orders
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.status(401).json({ Mmessage: "User not authorized" });
      }
      // let query = {};
      // // here email is user id uid because email null
      // if (email) {
      //   query = { email: email };
      // }
      // const cursor = orderCollection.find(query);
      // const orders = await cursor.toArray();
      // res.json(orders);
    });

    //   Post orders information
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Ema john server is running");
});

app.listen(port, () => {
  console.log("Ema jhon server is running on port : ", port);
});
