const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlerware
app.use(cors());
app.use(express.json());

// mongodb config
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jjvalws.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// mongodb function
async function run() {
  try {
    const appointmentOptionsCollections = client
      .db("doctorsPortal")
      .collection("appointmentOptions");

    // get available appointments
    app.get("/appointmentOptions", async (req, res) => {
      const query = {};

      const cursor = appointmentOptionsCollections.find(query);
      const options = await cursor.toArray();

      res.send(options);
    });
  } finally {
  }
}

run().catch(error => console.log(error));

//home route
app.get("/", (req, res) => {
  res.send("<h1>Doctors portal server is running 🚀</h1>");
});

// server listing
app.listen(port, () => {
  console.log(`server is running at port ${port}`);
});
