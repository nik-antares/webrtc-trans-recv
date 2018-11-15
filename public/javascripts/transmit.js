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

function gotStream(stream) {
	console.log('Received local stream');
	localStream = stream;

	//Transmitting local stream
	//audio2.srcObject = localStream;

	const audioTracks = localStream.getAudioTracks();

	if (audioTracks.length > 0) {
		console.log(`Using Audio device: ${audioTracks[0].label}`);
	}

	pc1.createOffer(offerOptions)
		.then(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
	console.log(`Failed to create session description: ${error.toString()}`);
}

function call () {
	console.log('Starting call');

	/* Create my connection */
	const servers = null;
	pc1 = new RTCPeerConnection(servers);
	console.log('Created local peer connection object pc1');
	pc1.onicecandidate = e => onIceCandidate(pc1, e);

	/* Getting local media stream */
	console.log('Requesting local stream');
	navigator.mediaDevices
		.getUserMedia({
			audio: true,
			video: false
		})
		.then(gotStream)
		.catch(e => {
			alert(`getUserMedia() error: ${e.name}`);
		});
}

window.addCandidates = function (candidate) {
	onIceCandidate2(candidate);
}

window.addAnswer = function (answer) {
	saveAnswer(answer);
}

window.addStream = function () {
	console.log('Adding Local Stream to peer connection');
	localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
}

function gotDescription1(desc) {
	console.log(`Offer from pc1\n${desc.sdp}`);
	console.log(`===================copy this offer=========\n${JSON.stringify (desc)}`);
	pc1.setLocalDescription(desc)
		.then(() => {
			desc.sdp = forceChosenAudioCodec(desc.sdp);
		}, onSetSessionDescriptionError);
}

function saveAnswer (desc) {
	console.log('Adding answer to remote description');
	pc1.setRemoteDescription(desc).then(() => {
		desc.sdp = forceChosenAudioCodec(desc.sdp);
	}, onSetSessionDescriptionError);
}

function getName(pc) {
	return (pc === pc1) ? 'pc1' : 'pc2';
}

function onIceCandidate(pc, event) {
	console.log(`===================copy this candidate=========\n${JSON.stringify (event.candidate)}`);
	console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onIceCandidate2(candidate) {
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
