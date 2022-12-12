const dotenv  = require('dotenv');
dotenv.config();

exports.DB_URL = process.env.MONGO_URL
exports.DB_NAME = 'bmkg'
exports.GEMPA_COLLECTION = 'gempa'
exports.CUACA_COLLECTION = 'cuaca'