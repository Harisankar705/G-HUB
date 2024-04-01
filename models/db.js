const mongoose = require('mongoose');
require('dotenv').config();

let db = async () => {
    try {
        const mongodbUri = process.env.MONGODB_URI ;
        await mongoose.connect(mongodbUri);
        console.log("Database connection established");
    } catch (err) {
        console.log("Database connection error", err);
        process.exit(1);
    }
}

module.exports = db;
