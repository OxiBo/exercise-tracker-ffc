require("dotenv").config();

const express = require("express"),
  bodyParser = require("body-parser"),
  cors = require("cors"),
  mongo = require("mongodb"),
  mongoose = require("mongoose"),
  app = express();

const User = require("./models/User"),
  Exercise = require("./models/Exercise");

const dataBaseUrl = process.env.MONGO_ATLAS_URI;
mongoose
  .connect(dataBaseUrl, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
  })
  .then(() => {
    console.log("Connected to DB!");
  })
  .catch(err => {
    console.log("ERROR:", err.message);
  });

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Not found middleware
// app.use((req, res, next) => {
//   return next({ status: 404, message: "not found" });
// });

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

// I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post("/api/exercise/new-user", async (req, res) => {
  const username = req.body.username;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    return res.send(
      "User with such name already exists/This username already taken"
    );
  }
  const newUser = await new User({ username }).save((err, createdUser) => {
    if (err) {
      console.log(err);
    } else {
      return res.send(createdUser);
    }
  });
});

// I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.get("/api/exercise/users", async (req, res) => {
  const users = await User.find();
  if (users) {
    return res.send(users);
  } else {
    return res.send({ error: "Something went wrong" });
  }
});

app.post("/api/exercise/add", async (req, res) => {
  const { userId, description, duration, date } = req.body;
  const user = await User.findById(userId);
  if (user) {
    const exerciseDate = date || undefined;
    if (description.length > 15) {
      return res.send("Description is too long");
    }
    new Exercise({
      _user: userId,
      description,
      duration,
      date: exerciseDate
    }).save((err, newExercise) => {
      if (err) {
        console.log(err);
        return res.send("Something went wrong");
      } else {
        const { description, duration, date } = newExercise;
        console.log(newExercise.date + ":" + typeof newExercise.date);
        return res.send({
          username: user.username,
          description,
          duration,
          date: new Date(date).toDateString()
        });
      }
    });
  }
});

// I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).
app.get("/api/exercise/log", async (req, res) => {
  //let user = await User.findById(req.query.userId).lean().exec(); - to make a regular object from a mongoose object - https://medium.com/@MonokromBE/a-solution-to-edit-returned-data-documents-by-a-mongoose-query-a10d84e3351c
  let user = await User.findById(req.query.userId);
  if (!user) {
    return res.send("Wrong userId/User is not found"); // return res.status(401).send({ error: "You must log in" });
  }

  let exerciseLog = [];
  // I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
  let findFrom, findTo;
  if (req.query.from && req.query.from) {
    findFrom = new Date(req.query.from);
    findTo = new Date(req.query.to);
    exerciseLog = await Exercise.find({ _user: req.query.userId })
      .find({
        date: { $gte: findFrom, $lt: findTo }
      })
      .limit(+req.query.limit); // limit argument must be numeric
  } else {
    exerciseLog = await Exercise.find({ _user: req.query.userId });
  }

  exerciseLog = exerciseLog.map(({ description, duration, date }) => {
    return {
      description,
      duration,
      date
    };
  });

  const logs = Object.assign(
    {},
    { _id: user._id, username: user.username, count: exerciseLog.length },
    { log: exerciseLog }
  );
  res.send(logs);
});

const listener = app.listen(process.env.PORT || 3002, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
