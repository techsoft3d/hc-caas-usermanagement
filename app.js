const express = require('express');
const path = require('path');

const app = express();

const caasAc = require('./server/app');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/viewer.html');
});

(async () => {
await caasAc.start(app);
let files = caasAc.getFiles();
let notConverted = await files.find({ "converted": true });
let i=0;
})();
app.listen(3000);

console.log('Server started on port 3000');




