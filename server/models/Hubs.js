const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const HubSchema = new Schema({ 
  name: { type: String, required: true},
  users: [{email:String, role: Number,accepted:Boolean}],  
});

module.exports = global.tm_con.model('Hubs', HubSchema);

