const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    side: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    time: { type: Date, default: Date.now }
});

const StockSchema = new mongoose.Schema({
    symbol: { type: String, required: true, uppercase: true },
    avgPrice: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    history: [TransactionSchema],
    // 新增字段
    status: { type: String, enum: ['active', 'settled'], default: 'active' },
    settledAt: { type: Date }
});

module.exports = mongoose.model('Stock', StockSchema);