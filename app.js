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

var server = require('http').createServer(app);

server.listen (3000);
 
const wss = new WebSocket.Server({server});

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
	        client.send(data);
	      }
    });
};

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(data) {
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	});
});
 /* 
wss1.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log ('=====from receiver===', message)
		wss2.on('connection', function connection(_ws) {
			_ws.send (message);
		});
	});
});*/
