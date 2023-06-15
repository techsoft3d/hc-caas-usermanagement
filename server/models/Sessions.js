const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SessionSchema = new Schema({ 
  user: { type: Object},
  hub: { type: Object},
  project: { type: Object}
}, {timestamps:true});

module.exports = global.tm_con.model('Sessions', SessionSchema);

