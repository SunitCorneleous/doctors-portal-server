const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// mongodb config
const { query } = require("express");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jjvalws.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  // get authorization from header
  const authHeader = req.headers.authorization;

  // check if the header exists
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  // split the token
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }

    req.decoded = decoded;
    next();
  });
}

// mongodb function
async function run() {
  try {
    const appointmentOptionsCollections = client
      .db("doctorsPortal")
      .collection("appointmentOptions");
    const bookingsCollections = client
      .db("doctorsPortal")
      .collection("bookings");
    const usersCollections = client.db("doctorsPortal").collection("users");
    const doctorsCollections = client.db("doctorsPortal").collection("doctors");

    // get available appointments
    app.get("/appointmentOptions", async (req, res) => {
      const query = {};

      const cursor = appointmentOptionsCollections.find(query);
      const options = await cursor.toArray();

      // get available appointments of query date
      const date = req.query.date;

      // booked options
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingsCollections
        .find(bookingQuery)
        .toArray();

      //filter booked options and map booked slots
      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(
          book => book.treatment === option.name
        );

        const bookedSlots = optionBooked.map(book => book.slot);

        const remainingSlots = option.slots.filter(
          slot => !bookedSlots.includes(slot)
        );

        option.slots = remainingSlots;
      });

      res.send(options);
    });

    // post a doctor
    app.post("/doctors", async (req, res) => {
      const doctor = req.body;
      const result = await doctorsCollections.insertOne(doctor);
      res.send(result);
    });

    // get appointment option name
    app.get("/appointmentOption", async (req, res) => {
      const query = {};

      const appointmentOption = await appointmentOptionsCollections
        .find(query)
        .project({ name: 1 })
        .toArray();

      res.send(appointmentOption);
    });

    /*
                  ***bookings***
     app.get('/bookings')  --> get all bookings
     app.get('/bookings/:id') --> get a booking by id
     app.post('/bookings') --> create a new booking
     app.patch('bookings/:id') --> update a booking by id
     app.delete('bookings/:id') --> delete a booking by id
     */

    // create a new booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const query = {
        appointmentDate: booking.appointmentDate,
        treatment: booking.treatment,
        email: booking.email,
      };

      const alreadyBooked = await bookingsCollections.find(query).toArray();

      const message = `You already have a booking on ${booking.appointmentDate}`;

      if (alreadyBooked.length) {
        return res.send({ acknowledged: false, message });
      }

      const result = await bookingsCollections.insertOne(booking);

      res.send(result);
    });

    // get booking by email
    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const bookings = await bookingsCollections.find(query).toArray();
      res.send(bookings);
    });

    // save user info to database
    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await usersCollections.insertOne(user);
      res.send(result);
    });

    //get jwt
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "2h",
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    // get all users (admin)
    app.get("/users", async (req, res) => {
      const query = {};

      const users = await usersCollections.find(query).toArray();

      res.send(users);
    });

    // set user as admin
    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const filter = { email: decodedEmail };
      const user = await usersCollections.findOne(filter);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // get if the user is admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);

      res.send({ isAdmin: user?.role === "admin" });
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
