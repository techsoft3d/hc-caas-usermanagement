const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const HubSchema = new Schema({ 
  name: { type: String, required: true},
  users: [{email:String, role: Number,accepted:Boolean}],  
  customData: { type: Object, required: false }

});

module.exports = global.tm_con.model('Hubs', HubSchema);

