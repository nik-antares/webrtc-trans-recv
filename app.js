const express     = require('express');
const path        = require('path');
const app         = express();
const port        = 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send ('Hello World!'));
app.get('/receive', (req, res) => res.send ('Hello World!'));
app.get('/transmit', (req, res) => { 
	res.render ('demo', {});
});

app.listen(port, () => console.log (`Example app listening on port ${port}!`));
