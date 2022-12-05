const Order = require("../models/Order");
const {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
} = require("./verifyToken");
const moment = require("moment");
const router = require("express").Router();
const mongoose = require("mongoose");

//CREATE

router.post("/", verifyToken, async (req, res) => {
  const newOrder = new Order(req.body);

  try {
    const savedOrder = await newOrder.save();
    res.status(200).json(savedOrder);
  } catch (err) {
    res.status(500).json(err);
  }
});

//UPDATE
router.put("/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(500).json(err);
  }
});

//DELETE
router.delete("/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json("Order has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER ORDERS
router.get("/find/:userId", verifyTokenAndAuthorization, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json(err);
  }
});

// //GET ALL
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/findorder/:customerId", async (req, res) => {
  try {
    const order = await Order.findOne({ customerId: req.params.customerId });
    res.status(200).json(order.products[0].img);
  } catch (err) {
    res.status(404).json(err);
  }
});

// GET MONTHLY INCOME
router.get("/stats", async (req, res) => {
  //   const productId = req.query.pid;
  //   const date = new Date();
  //   const lastMonth = new Date(date.setMonth(date.getMonth() - 1));
  //   const previousMonth = new Date(new Date().setMonth(lastMonth.getMonth() - 1));
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));

  try {
    // const income = await Order.aggregate([
    //   { $match: { createdAt: { $gte: previousMonth } } },
    //   {
    //     $match: {
    //       createdAt: { $gte: previousMonth },
    //       ...(productId && {
    //         products: { $elemMatch: { productId } },
    //       }),
    //     },
    //   },
    //   {
    //     $project: {
    //       month: { $month: "$createdAt" },
    //       sales: "$amount",
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$month",
    //       total: { $sum: "$sales" },
    //     },
    //   },
    // ]);

    const yearlyTransactions = await Order.aggregate([
      { $match: {} },
      {
        $group: {
          _id: { $year: "$createdAt" },
          sales: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": -1 } },
      { $limit: 12 },
    ]);
    // yearlyTransactions = yearlyTransactions
    //   .map((item) => {
    //     console.log(item);
    //     const { _id: year, sales } = item;

    //     const _id = moment().year(year).format("Y");
    //     console.log(_id, sales);
    //     return { _id, sales };
    //   })
    //   .reverse();

    let monthlyTransactions = await Order.aggregate([
      { $match: { createdAt: { $gte: lastYear } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          sales: { $sum: "$total" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    monthlyTransactions = monthlyTransactions
      .map((item) => {
        const {
          _id: { year, month },
          sales,
        } = item;
        const _id = moment()
          .month(month - 1)
          .year(year)
          .format("MMM Y");
        return { _id, sales };
      })
      .reverse();
    res.status(200).json({ yearlyTransactions, monthlyTransactions });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/stats/:productId", async (req, res) => {
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));
  const productId = req.params.productId;
  try {
    let yearlySales = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: {
            item: "$products.productId",
            year: { $year: "$createdAt" },
          },
          itemQty: { $push: "$products.quantity" },
        },
      },
      {
        $group: {
          _id: "$_id.item",
          items: {
            $push: {
              _id: "$_id.year",
              itemQty: { $sum: "$itemQty" },
            },
          },
        },
      },
    ]);

    let monthlySales = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: {
            item: "$products.productId",
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          itemQty: { $push: "$products.quantity" },
        },
      },
      {
        $group: {
          _id: "$_id.item",
          items: {
            $push: {
              date: {
                year: "$_id.year",
                month: "$_id.month",
              },
              itemQty: { $sum: "$itemQty" },
            },
          },
        },
      },
      {
        $sort: { "items.date.year": -1, "items.date.month": -1 },
      },
      //   { $limit: 12 },
    ]);

    monthlySales = monthlySales.filter((item) => item._id === productId);
    monthlySales = monthlySales[0].items
      .map((item) => {
        const {
          date: { year, month },
          itemQty,
        } = item;

        const _id = moment()
          .month(month - 1)
          .year(year)
          .format("MMM Y");
        return { _id, itemQty };
      })
      .reverse();

    yearlySales = yearlySales.filter((item) => item._id === productId);

    res.status(200).json({ yearlySales, monthlySales });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
