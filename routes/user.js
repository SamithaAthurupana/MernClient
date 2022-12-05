const User = require("../models/User");
const {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
} = require("./verifyToken");
const moment = require("moment");
const router = require("express").Router();

//UPDATE
router.put("/:id", verifyTokenAndAuthorization, async (req, res) => {
  if (req.body.password) {
    req.body.password = CryptoJS.AES.encrypt(
      req.body.password,
      process.env.PASS_SEC
    ).toString();
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

//DELETE
router.delete("/:id", verifyTokenAndAuthorization, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER
router.get("/find/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET ALL USER
router.get("/", async (req, res) => {
  //   console.log(req.query);
  const query = req.query.new;
  try {
    const users = query
      ? await User.find().sort({ _id: -1 }).limit(5)
      : await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER STATS
router.get("/stats", async (req, res) => {
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));
  //   console.log(lastYear);

  try {
    // const data = await User.aggregate([
    //   { $match: { createdAt: { $gte: lastYear } } },
    //   {
    //     $project: {
    //       month: { $month: "$createdAt" },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$month",
    //       total: { $sum: 1 },
    //     },
    //   },
    // ]);

    let yearlyRegistrations = await User.aggregate([
      { $match: {} },
      {
        $group: {
          _id: { $year: "$createdAt" },
          registrations: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1 } },
      //   { $limit: 12 },
    ]);
    // yearlyRegistrations = yearlyRegistrations
    //   .map((item) => {
    //     const { _id: year, registrations } = item;

    //     const _id = moment().year(year).format("Y");
    //     console.log(_id, registrations);
    //     return { _id, registrations };
    //   })
    //   .reverse();

    let monthlyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: lastYear } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          registrations: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);
    monthlyRegistrations = monthlyRegistrations
      .map((item) => {
        const {
          _id: { year, month },
          registrations,
        } = item;

        const _id = moment()
          .month(month - 1)
          .year(year)
          .format("MMM Y");
        return { _id, registrations };
      })
      .reverse();

    res.status(200).json({ yearlyRegistrations, monthlyRegistrations });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
