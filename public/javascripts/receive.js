let pc1;
let audio2;
let localStream;

const offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 0,
	voiceActivityDetection: false
};

window.onload = function() {
	audio2 = document.querySelector('#audio2');
};

var ws = new WebSocket("ws://nikhil.local:3000");

ws.onopen = function() {
	console.log ('====open======');
	//ws.send("Message from receiver");
};

ws.onmessage = function (evt) { 
	var msg = JSON.parse (evt.data);

	if (msg.client == 'receive')
		return;

	if (msg.type == 'offer')
		generateAnswer (msg.data);

	if (msg.type == 'candidate')
		onIceCandidate2 (msg.data);
};

ws.onclose = function() { 
	alert("Connection is closed..."); 
};

function call () {
	console.log('Starting call');

	/* Create my connection */
	const servers = null;
	pc1 = new RTCPeerConnection(servers);
	console.log('Created local peer connection object pc1');
	pc1.onicecandidate = e => onIceCandidate(pc1, e);
	pc1.ontrack = gotRemoteStream;
}

window.addCandidates = function (candidate) {
	onIceCandidate2(candidate);
	//pc1.ontrack = gotRemoteStream;
}

window.createAnswer = function (offer) {
	generateAnswer (offer);
}

function onCreateSessionDescriptionError(error) {
	console.log(`Failed to create session description: ${error.toString()}`);
}

function generateAnswer(desc) {
	return pc1.setRemoteDescription(desc).then(() => {
		pc1.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
	}, onSetSessionDescriptionError);
}

function gotDescription2(desc) {
	console.log(`===================copy this answer=========\n${JSON.stringify (desc)}`);
	
	ws.send(JSON.stringify ({
		client : 'receive',
		type : 'offer',
		data : desc
	}));

	pc1.setLocalDescription(desc).then(() => {
		desc.sdp = forceChosenAudioCodec(desc.sdp);
	}, onSetSessionDescriptionError);
}

function gotRemoteStream(e) {
	if (audio2.srcObject !== e.streams[0]) {
		audio2.srcObject = e.streams[0];
		console.log('Received remote stream');
	}
}

function getName(pc) {
	return (pc === pc1) ? 'pc1' : 'pc2';
}

function onIceCandidate(pc, event) {
	console.log(`===================copy this candidate=========\n${JSON.stringify (event.candidate)}`);
	console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);

	ws.send(JSON.stringify ({
		client : 'receive',
		type : 'candidate',
		data : event.candidate
	}));
}

function onIceCandidate2(candidate) {
	if (!candidate)
		return;

	pc1.addIceCandidate(new RTCIceCandidate (candidate))
		.then(
			() => onAddIceCandidateSuccess(),
			err => onAddIceCandidateError(err)
		);
	console.log(`pc2 ICE candidate:\n${candidate}`);
}

function onAddIceCandidateSuccess() {
	console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
	console.log(`Failed to add ICE Candidate: ${error.toString()}`);
}

function onSetSessionDescriptionError(error) {
	console.log(`Failed to set session description: ${error.toString()}`);
}

function forceChosenAudioCodec(sdp) {
	return maybePreferCodec(sdp, 'audio', 'send', 'opus');//codecSelector.value);
}

// Copied from AppRTC's sdputils.js:

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
	const str = `${type} ${dir} codec`;
	if (codec === '') {
		console.log(`No preference on ${str}.`);
		return sdp;
	}

	console.log(`Prefer ${str}: ${codec}`);

	const sdpLines = sdp.split('\r\n');

	// Search for m line.
	const mLineIndex = findLine(sdpLines, 'm=', type);
	if (mLineIndex === null) {
		return sdp;
	}

	// If the codec is available, set it as the default in m line.
	const codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
	console.log('codecIndex', codecIndex);
	if (codecIndex) {
		const payload = getCodecPayloadType(sdpLines[codecIndex]);
		if (payload) {
			sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
		}
	}

	sdp = sdpLines.join('\r\n');
	return sdp;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
	return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
	const realEndLine = endLine !== -1 ? endLine : sdpLines.length;
	for (let i = startLine; i < realEndLine; ++i) {
		if (sdpLines[i].indexOf(prefix) === 0) {
			if (!substr ||
				sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
				return i;
			}
		}
	}
	return null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
	const pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
	const result = sdpLine.match(pattern);
	return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
	const elements = mLine.split(' ');

	// Just copy the first three parameters; codec order starts on fourth.
	const newLine = elements.slice(0, 3);

	// Put target payload first and copy in the rest.
	newLine.push(payload);
	for (let i = 3; i < elements.length; i++) {
		if (elements[i] !== payload) {
			newLine.push(elements[i]);
		}
	}
	return newLine.join(' ');
}


call ();
