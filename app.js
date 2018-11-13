const express     = require('express');
const path        = require('path');
const WebSocket   = require('ws');
const app         = express();
const port        = 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send ('Hello World!'));
app.get('/receive', (req, res) => {
	res.render ('receive', {});
});
app.get('/transmit', (req, res) => { 
	res.render ('transmit', {});
});

var server1 = require('http').createServer(app);
var server2 = require('http').createServer(app);

server1.listen (3000);
server2.listen (4000);
 
const wss1 = new WebSocket.Server({server : server1});
const wss2 = new WebSocket.Server({server : server2});

wss2.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log ('=====from transmitter===', message)
		wss1.on('connection', function connection(_ws) {
			_ws.send (message);
		});
	});	
});

wss1.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log ('=====from receiver===', message)
		wss2.on('connection', function connection(_ws) {
			_ws.send (message);
		});
	});
});
