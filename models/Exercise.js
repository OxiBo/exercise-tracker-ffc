const mongoose = require("mongoose");
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
  _user: { type: Schema.Types.ObjectId, ref: "User" }
});

module.exports = mongoose.model("exercise", exerciseSchema);
