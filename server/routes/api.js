const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');

// 新增交易记录接口
router.post('/add-transaction', async (req, res) => {
    try {
        const { symbol, side, qty, price, cardId } = req.body;
        const total = qty * price;
        let stock;
        let isNewCard = false;

        if (cardId) {
            // 卡片按钮操作：直接按 cardId 查找卡片
            stock = await Stock.findById(cardId);
            if (!stock) return res.status(404).json({ message: '卡片不存在' });
            if (stock.status !== 'active') {
                return res.status(400).json({ message: '该卡片已结算，无法新增交易' });
            }
        } else {
            // FAB 录入：查找是否存在相同 symbol 的活跃卡片
            stock = await Stock.findOne({ symbol: symbol.toUpperCase(), status: 'active' });
            if (stock) {
                // 已存在活跃卡片，合并交易记录
                if (stock.status !== 'active') stock.status = 'active'; // 安全保护
            } else {
                // 全新卡片
                stock = new Stock({ symbol: symbol.toUpperCase(), history: [], status: 'active' });
                isNewCard = true;
            }
        }

        // 追加交易记录并重新计算汇总
        stock.history.push({ side, qty, price, total });

        let tQty = 0, tInvest = 0;
        stock.history.forEach(item => {
            if (item.side === '买入' || item.side === 'Buy') {
                tQty += item.qty;
                tInvest += item.total;
            } else {
                tQty -= item.qty;
                tInvest -= item.total;
            }
        });
        stock.totalQty = tQty;
        stock.totalInvestment = tInvest;
        stock.avgPrice = tQty > 0 ? (tInvest / tQty) : 0;

        await stock.save();
        const savedTransaction = stock.history[stock.history.length - 1];

        res.json({
            status: 200,
            isNewCard: isNewCard,
            cardId: stock._id,
            data: {
                id: savedTransaction._id,
                side: savedTransaction.side,
                qty: savedTransaction.qty,
                price: savedTransaction.price,
                total: savedTransaction.total,
                time: (() => {
                    const d = new Date(savedTransaction.time);
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    return `${month}/${day} ${hours}:${minutes}`;
                })()
            }
        });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ status: 500, message: err.message });
    }
});
// 获取所有股票持仓及历史记录
router.get('/stocks', async (req, res) => {
    try {
        const stocks = await Stock.find({ status: 'active' });
        res.json(stocks);
    } catch (err) {
        console.error('获取股票数据失败:', err);
        res.status(500).json({ status: 500, message: err.message });
    }
});
// 删除单条交易记录
router.delete('/transaction/:stockId/:transactionId', async (req, res) => {
    try {
        const { stockId, transactionId } = req.params;
        const stock = await Stock.findById(stockId);
        if (!stock) {
            return res.status(404).json({ message: '股票卡片不存在' });
        }

        // 找到并移除对应的历史记录
        const txIndex = stock.history.findIndex(tx => tx._id.toString() === transactionId);
        if (txIndex === -1) {
            return res.status(404).json({ message: '交易记录不存在' });
        }
        stock.history.splice(txIndex, 1);

        // 如果历史记录为空，可以选择删除整张卡片，也可以保留空卡片（根据业务需求，这里保留空卡片）
        if (stock.history.length === 0) {
            // 若希望无记录时自动删除卡片，可取消注释下一行
            // await Stock.findByIdAndDelete(stockId);
            // return res.json({ status: 200, message: '卡片已删除', cardRemoved: true });

            // 保留空卡片，重置汇总数据
            stock.totalQty = 0;
            stock.totalInvestment = 0;
            stock.avgPrice = 0;
        } else {
            // 重新计算汇总数据
            let tQty = 0, tInvest = 0;
            stock.history.forEach(item => {
                if (item.side === '买入' || item.side === 'Buy') {
                    tQty += item.qty;
                    tInvest += item.total;
                } else {
                    tQty -= item.qty;
                    tInvest -= item.total;
                }
            });
            stock.totalQty = tQty;
            stock.totalInvestment = tInvest;
            stock.avgPrice = tQty !== 0 ? (tInvest / tQty) : 0;
        }

        await stock.save();
        res.json({ status: 200, message: '交易记录已删除' });
    } catch (err) {
        console.error('删除交易记录失败:', err);
        res.status(500).json({ message: err.message });
    }
});
// 删除整张卡片
router.delete('/card/:stockId', async (req, res) => {
    try {
        const { stockId } = req.params;
        const result = await Stock.findByIdAndDelete(stockId);
        if (!result) {
            return res.status(404).json({ message: '卡片不存在' });
        }
        res.json({ status: 200, message: '卡片已删除' });
    } catch (err) {
        console.error('删除卡片失败:', err);
        res.status(500).json({ message: err.message });
    }
});



// 结算卡片：标记为已结算
router.post('/settle/:stockId', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.stockId);
        if (!stock) return res.status(404).json({ message: '卡片不存在' });

        stock.status = 'settled';
        stock.settledAt = new Date();
        await stock.save();

        res.json({ status: 200, message: '结算成功' });
    } catch (err) {
        console.error('结算失败:', err);
        res.status(500).json({ message: err.message });
    }
});
// 删除历史结算记录（物理删除已结算的卡片）
router.delete('/history/:id', async (req, res) => {
    try {
        const result = await Stock.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: '记录不存在' });
        }
        res.json({ status: 200, message: '历史记录已删除' });
    } catch (err) {
        console.error('删除历史记录失败:', err);
        res.status(500).json({ message: err.message });
    }
});
// 获取历史结算清单（已平仓卡片）
router.get('/history', async (req, res) => {
    try {
        const settledStocks = await Stock.find({ status: 'settled' }).sort({ settledAt: -1 });
        const historyRecords = settledStocks.map(stock => {
            let buyTotal = 0, sellTotal = 0;
            stock.history.forEach(tx => {
                if (tx.side === '买入') buyTotal += tx.total;
                else sellTotal += tx.total;
            });
            return {
                _id: stock._id,
                symbol: stock.symbol,
                settleTime: stock.settledAt,
                buyValue: buyTotal,
                sellValue: sellTotal,
                pnl: sellTotal - buyTotal
            };
        });
        res.json(historyRecords);
    } catch (err) {
        console.error('获取历史清单失败:', err);
        res.status(500).json({ message: err.message });
    }
});
// 获取单张卡片完整数据（用于查看已结算记录的交易明细）
router.get('/card/:id', async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);
        if (!stock) return res.status(404).json({ message: '卡片不存在' });
        res.json(stock);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;