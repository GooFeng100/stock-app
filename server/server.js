const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://stock-app-mongo:27017/trading_desk';
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'html');

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use(express.static(STATIC_DIR));

app.get('*', (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

mongoose.connect(MONGO_URL).then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
        console.log(`Stock app listening on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection failed:', err);
});
