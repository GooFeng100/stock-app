const mongoose = require('mongoose');

// 1. 当前持仓模型
const PositionSchema = new mongoose.Schema({
    symbol: { type: String, required: true, uppercase: true },
    avgPrice: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    history: [{
        time: String,
        type: String, // '买入' 或 '卖出'
        qty: Number,
        price: Number
    }]
});

// 2. 历史结算清单模型
const HistorySchema = new mongoose.Schema({
    symbol: String,
    settleTime: String,
    buyValue: Number,
    sellValue: Number,
    pnl: Number,
    records: Array // 结算时的完整交易记录备份
});

module.exports = {
    Position: mongoose.model('Position', PositionSchema),
    History: mongoose.model('History', HistorySchema)
};