const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlerware
app.use(cors());
app.use(express.json());

//home route
app.get("/", (req, res) => {
  res.send("<h1>Doctors portal server is running 🚀</h1>");
});

// server listing
app.listen(port, () => {
  console.log(`server is running at port ${port}`);
});
