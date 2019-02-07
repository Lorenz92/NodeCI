const mongoose = require("mongoose");
const User = mongoose.model("User"); //in principio Jest non conosce i modelli di mongoose perchè Jest esegue solo i file .test.js -> perciò creiamo un setup.js

module.exports = () => {
  return new User({}).save();
};
