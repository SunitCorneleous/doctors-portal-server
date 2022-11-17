const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
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
    const bookingsCollections = client
      .db("doctorsPortal")
      .collection("bookings");

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
