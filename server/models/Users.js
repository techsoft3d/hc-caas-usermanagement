const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({ 
  firstName: { type: String, required: true},
  lastName: { type: String, required: true},
  email: { type: String, required: true, unique:true},
  password: { type: String, required: true},
  status: { type: String, required: false, default:"active"},


}, {timestamps:true});

module.exports = global.tm_con.model('Users', UserSchema);

