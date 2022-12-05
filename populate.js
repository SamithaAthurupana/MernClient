const fs = require("fs/promises");
// const User = require("./models/User");
// const Product = require("./models/Product");
const Order = require("./models/Order");
const mongoose = require("mongoose");

require("dotenv").config();

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    const orderData = JSON.parse(
      await fs.readFile("./order_data.json", { encoding: "utf8" })
    );

    await Order.create(orderData);
    console.log("Success!");
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

start();
