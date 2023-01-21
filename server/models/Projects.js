const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProjectSchema = new Schema({ 
  name: { type: String, required: true},
  users: [{email:String, role: Number}],
  hub: { type: Schema.Types.ObjectId, ref: 'Hub'},
  customData: { type: Object, required: false }
}, {timestamps:true});

module.exports = global.tm_con.model('Projects', ProjectSchema);

