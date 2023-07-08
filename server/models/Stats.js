const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StatsSchema = new Schema({ 
  Type: { type: String, required: true},
  From: { type: String, required: true},
  Value: { type: String, required: true},
}, {timestamps:true});

module.exports = global.tm_con.model('Stats', StatsSchema);

