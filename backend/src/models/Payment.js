const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../constants/status');

/**
 * Records every Razorpay subscription-plan transaction (Monthly/Yearly
 * upgrades). The subscriber is either a Company or a Candidate account —
 * exactly one of `companyId` / `candidateId` is populated, chosen by
 * `accountType`.
 */
const paymentSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: ['company', 'candidate'],
      required: true,
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
    planId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentGateway: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
    },
    paymentDate: { type: Date, default: null },
    invoiceNumber: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

paymentSchema.pre('validate', function validateAccount(next) {
  if (this.accountType === 'company' && !this.companyId) {
    return next(new Error('companyId is required when accountType is company'));
  }
  if (this.accountType === 'candidate' && !this.candidateId) {
    return next(new Error('candidateId is required when accountType is candidate'));
  }
  next();
});

paymentSchema.index({ companyId: 1 });
paymentSchema.index({ candidateId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
