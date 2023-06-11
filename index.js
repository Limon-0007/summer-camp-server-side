const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization; //need to get data from headers
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  // bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s4mg6y0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("summerCampDB").collection("users");
    const classesCollection = client.db("summerCampDB").collection("classes");
    const instructorsCollection = client
      .db("summerCampDB")
      .collection("instructors");

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // users related api

    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users?.email };
      const excitingUser = await usersCollection.findOne(query);
      if (excitingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    app.get("/users", verifyJwt, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // classes related api
    app.get("/classes", verifyJwt, verifyAdmin, async (req, res) => {
      const result = await classesCollection.find().toArray();
      result.sort((a, b) => b.num_students - a.num_students); // Sort by number of students in descending order
      res.send(result);
    });

    app.get("/classes/approved", async (req, res) => {
      const result = await classesCollection.find({status: "approved"}).toArray();
      result.sort((a, b) => b.num_students - a.num_students); // Sort by number of students in descending order
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const newItem = req.body;
      const result = await classesCollection.insertOne(newItem);
      res.send(result);
    });

    app.get("/classes/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/classes/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classesCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    app.patch("/classes/declined/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "declined",
        },
      };
      const result = await classesCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    // instructors related api
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      result.sort((a, b) => b.number_of_students - a.number_of_students);
      res.send(result);
    });

    app.get("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await instructorsCollection.findOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, (req, res) => {
  console.log(`server is running on port ${port}`);
});
