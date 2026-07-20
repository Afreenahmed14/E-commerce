const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay order (currently used for subscription upgrades — see
 * subscriptionController.createSubscriptionOrder). The amount is always
 * computed server-side and passed in here — never trusted from the client
 * — to prevent price tampering.
 */
const createOrder = async ({ amount, currency = 'INR', receipt }) => {
  return razorpay.orders.create({
    amount, // smallest currency unit (paise for INR)
    currency,
    receipt,
    payment_capture: 1,
  });
};

/**
 * Verifies the HMAC SHA256 signature Razorpay returns after checkout to
 * confirm the payment was genuinely authorized and not spoofed client-side.
 */
const verifySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

module.exports = { razorpay, createOrder, verifySignature };
