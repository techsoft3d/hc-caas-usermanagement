const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const csFilesSchema = new Schema({ 
  name: {
    type: String,
    required: true
  },
  storageID: {
    type: String,
    required: true
  },
  converted: {
    type: Boolean,
    required: true
  },
 
  filesize: { 
    type:Number,
    required: false
  },

  uploaded: { 
    type:Date,
    required: false
  },

  project: {
    type: Schema.Types.ObjectId,
    ref: 'Projects',
    required: true
  },

});

module.exports = global.tm_con.model('CsFiles', csFilesSchema);

