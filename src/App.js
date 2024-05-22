import React, {useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';

function App() {
  const localStream = useRef(null);  // for directly manipulating DOM elements; otherwise they are considered react components
  const remoteStream = useRef();
  const remoteTrack = useRef(new MediaStream());
  const connection = useRef(null);  // RTCPeerConnection
  const offer = useRef(null);

  const socket = useRef(null);
  //const myCandidates = useRef([]);
  const [canOffer, setCanOffer] = useState(false);  // using 'useState' because change in this should trigger re-render (button)
  const didIOffer = useRef(false);

  const offererIndex = useRef(-1);  // represents the index till which we have processed the candidates.
  const answererIndex = useRef(-1);
  
  useEffect(() => {
    const constraints = {
      audio: true,
      video: true
    }
    const requestPermission = async() => {
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        localStream.current.srcObject = stream;
        console.log("got media stream");
        
      }, (reasonForFailure) => {
        console.log(reasonForFailure);
      })
    }
    
    requestPermission();
    socket.current = io('http://localhost:5000')
    /*socket.current = io('https://86f8-2401-4900-3685-9904-84a-dbef-7896-cca1.ngrok-free.app', {  // change this link whenever you run ngrok
      extraHeaders: {
        "ngrok-skip-browser-warning": 5500
      }
    })*/

    socket.current.on('offerAvailable', (status) => {
      setCanOffer(status.status);
      offer.current = status.offer;
    })

    socket.current.on('answer', (answer) => {
      console.log("I received an answer to my offer");
      connection.current.setRemoteDescription(answer).then(() => {
        console.log("offerer set remote description");
        console.log("I am offerer; can answerer accept trickled ice? "+connection.current.canTrickleIceCandidates);
        socket.current.emit('sendAnswererCandidates');
      })
    })

    /*socket.current.on('iceCandidates', (object) => {
      if(didIOffer.current){
        for(const c of object.answererCandidates){
          connection.current.addIceCandidate(c).then(() => console.log("answerer's candidate added"));
        }
      }
      else{
        for(const c of object.offererCandidates){
          connection.current.addIceCandidate(c).then(() => console.log("offerer's candidate added"));
        }
      }
    })*/

    socket.current.on('offererCandidate', (offererCandidates) =>{
      console.log("answerer received array of offerer candidates: "+offererCandidates.candidates.length);
      offererIndex.current = offererIndex.current + 1;
      console.log("offererIndex: "+offererIndex.current);
      let executed = false;
      while(offererIndex.current < offererCandidates.candidates.length){
        executed = true;
        connection.current.addIceCandidate(offererCandidates.candidates[offererIndex]).then(() => {
          console.log("added 1 trickled candidate sent by offerer; I am answerer.");
        })
        offererIndex.current = offererIndex.current + 1;  // WEIRD: putting this update stmt. inside then() makes infinite loop
      }
      console.log("while loop: "+executed);
      offererIndex.current = offererIndex.current - 1;
    })
    
    socket.current.on('answererCandidate', (answererCandidates) => {
      console.log("offerer received array of answerer candidates: "+answererCandidates.candidates.length);
      answererIndex.current = answererIndex.current + 1;
      let executed = false;
      while(answererIndex.current < answererCandidates.candidates.length){
        executed = true;
        connection.current.addIceCandidate(answererCandidates.candidates[answererIndex]).then(() => {
          console.log("added 1 trickled candidate sent by answerer; I am offerer.");
        })
        answererIndex.current = answererIndex.current + 1;
      }
      console.log("while loop: "+executed);
      answererIndex.current = answererIndex.current - 1;
    })

    return () => {
      socket.current.disconnect();
    }
  }, [])

  const onOpenConnection = (event) => {
    connection.current = new RTCPeerConnection({
      iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"]
      }]
    });
    
    connection.current.addEventListener('iceconnectionstatechange', (event) => {
      console.log("current state of ICE: "+ connection.current.iceConnectionState);
    })
    
    
    connection.current.addEventListener("icegatheringstatechange", (event) => {
      console.log("current state of ICE: "+ connection.current.iceConnectionState);
      switch(event.target.iceGatheringState){
        case "gathering":
          console.log("switched to gathering more candidates.");
          break;
        case "complete":
          console.log("finished gathering ice candidates.");
          // emit the array to the server
          // socket.current.emit('iceCandidates', {offerer: didIOffer.current, candidates: myCandidates.current});
          break;
        default:
          break;
      }
    })

    connection.current.addEventListener('connectionstatechange', (event) => {
      console.log("STATE: "+connection.current.connectionState);
    })

    // guess: gathering this starts only after setLocalDescription(), so didIOffer should work fine.
    connection.current.addEventListener("icecandidate", (event) => {
      if(event.candidate !== null){
        // myCandidates.current.push(event.candidate);
        socket.current.emit(didIOffer.current ? 'offererCandidate' : 'answererCandidate', event.candidate);
        console.log("========== found candidate: " + event.candidate);
      }
    })


    localStream.current.srcObject.getTracks().forEach((item, index) => {
      console.log(item);
      connection.current.addTrack(item);
    })

    console.log("tracks added");

    
    if(canOffer){
      connection.current.createOffer().then((offer) => {
        didIOffer.current = true;
        console.log(offer);
        return connection.current.setLocalDescription(offer);
      }).then(() => {
        console.log("offerer set local description");
        socket.current.emit('offer', connection.current.localDescription);
      }).catch((reason) => console.log(reason));
    }
    else{
      connection.current.setRemoteDescription(offer.current).then(() => {
        console.log("answerer set remote description");
        return connection.current.createAnswer();
        }).then((answer) => {
          didIOffer.current = false;
          console.log(answer);
          return connection.current.setLocalDescription(answer);
        }).then(() => {
          console.log("answerer set local description");
          socket.current.emit('answer', connection.current.localDescription);
          console.log("I am answerer; can offerer accept trickled ice? "+connection.current.canTrickleIceCandidates);
          socket.current.emit('sendOffererCandidates');
        }).catch((reason) => console.log(reason));
    }

    connection.current.addEventListener('track', (event) => {
      // this fires 2 times: once for camera track, once for microphone track
      console.log("event: "+event);
      console.log("received track: "+event.track);  // mediastreamtrack object
      console.log("content hint: "+event.track.contentHint);  // no output
      console.log("streams: "+event.streams.length);  // length is 0
      remoteTrack.current.addTrack(event.track);
      remoteStream.current.srcObject = remoteTrack.current;
    });
  }
  
  return <>
  <div id = "top-button-row">
  <button onClick = {onOpenConnection}>{canOffer ? 'Open Connection' : 'Answer Connection'}</button>
  <button>Close Connection</button>
  </div>
  <div>
    <video ref = {localStream} controls autoPlay width = "300" height = "200"></video>
    <video ref = {remoteStream} controls autoPlay width = "300" height = "200"></video>
  </div>
  </>;
}

export default App;
