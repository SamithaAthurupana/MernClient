const Stripe = require("stripe");
const express = require("express");
const Order = require("../models/Order");

require("dotenv").config();
const stripe = Stripe(process.env.STRIPE_KEY);
const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId,
      cart: JSON.stringify(req.body.cartItems),
    },
  });
  const line_items = req.body.cartItems.map((item) => {
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: [item.img],
          description: item.desc,
          metadata: {
            id: item._id,
          },
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    customer: customer.id,
    success_url: `/success?customer_id=${customer.id}`,
    cancel_url: `/cart`,
  });

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  lineItems.data.map(
    (item) =>
      (item.description = line_items[0].price_data.product_data.description)
  );

  //   res.redirect(303, session.url);
  //   res.send({ url: session.url });
  res.status(200).json({ status: "success", session });
});

// Create order function
const createOrder = async (req, res, customer, data) => {
  const Items = JSON.parse(customer.metadata.cart);

  const products = Items.map((item) => {
    return {
      productId: item._id,
      img: item.img,
      quantity: item.quantity,
    };
  });

  const newOrder = new Order({
    userId: customer.metadata.userId,
    customerId: data.customer,
    paymentIntentId: data.payment_intent,
    products,
    subtotal: data.amount_subtotal,
    total: data.amount_total,
    shipping: data.customer_details,
    payment_status: data.payment_status,
  });

  try {
    const savedOrder = await newOrder.save();
    return savedOrder;
  } catch (err) {
    console.log(err);
  }
};

// Stripe webhoook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    let data;
    let eventType;
    let event;

    // Check if webhook signing is configured.
    // const webhookSecret =
    //   "whsec_4986163c66143ce395bfe1a55cfa7b540a112f24b9d05acc71d3e1c82789669d";
    const webhookSecret = process.env.STRIPE_WEB_HOOK;

    if (webhookSecret) {
      const signature = req.headers["stripe-signature"];

      // Retrieve the event by verifying the signature using the raw body and secret.

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:  ${err}`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data.object;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the checkout.session.completed event
    if (eventType === "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then(async (customer) => {
          const savedOrder = await createOrder(req, res, customer, data);
          //   return res.status(200).json({ order: savedOrder });
        })
        .catch((err) => console.log(err.message));
    }

    res.status(200).end();
  }
);

// router.get("/success", async (req, res) => {
//   const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
//   const customer = await stripe.customers.retrieve(session.customer);

//   res.send(
//     `<html><body><h1>Thanks for your order, ${customer}!</h1></body></html>`
//   );
// });

module.exports = router;
