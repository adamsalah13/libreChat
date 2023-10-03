const mongoose = require('mongoose');
const transactionSchema = require('./schema/transaction');
const { getMultiplier } = require('./tx');
const Balance = require('./Balance');

// Method to calculate and set the tokenValue for a transaction
transactionSchema.methods.calculateTokenValue = function () {
  if (!this.valueKey || !this.tokenType) {
    this.tokenValue = this.rawAmount;
  }
  const { valueKey, tokenType, model } = this;
  const multiplier = getMultiplier({ valueKey, tokenType, model });
  this.tokenValue = this.rawAmount * multiplier;
  if (this.context && this.context === 'incomplete') {
    this.tokenValue = this.tokenValue * 1.2;
  }
};

// Static method to create a transaction and update the balance
transactionSchema.statics.create = async function (transactionData) {
  const Transaction = this;

  const transaction = new Transaction(transactionData);
  transaction.calculateTokenValue();

  // Save the transaction
  await transaction.save();

  // Adjust the user's balance
  return await Balance.findOneAndUpdate(
    { user: transaction.user },
    { $inc: { tokenCredits: transaction.tokenValue } },
    { upsert: true, new: true },
  );
};

module.exports = mongoose.model('Transaction', transactionSchema);
