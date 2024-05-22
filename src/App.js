import React, {useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';

function App() {
  const localStream = useRef(null);  // for directly manipulating DOM elements; otherwise they are considered react components
  const remoteStream = useRef();
  const remoteTrack = useRef(new MediaStream());
  const connection = useRef(null);  // RTCPeerConnection
  const offer = useRef(null);

  const socket = useRef(null);
  const myCandidates = useRef([]);
  const [canOffer, setCanOffer] = useState(false);  // using 'useState' because change in this should trigger re-render (button)
  const didIOffer = useRef(false);
  
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
    //socket.current = io('http://localhost:5000')
    socket.current = io('https://86f8-2401-4900-3685-9904-84a-dbef-7896-cca1.ngrok-free.app', {  // change this link whenever you run ngrok
      extraHeaders: {
        "ngrok-skip-browser-warning": 5500
      }
    })

    socket.current.on('offerAvailable', (status) => {
      setCanOffer(status.status);
      offer.current = status.offer;
    })

    socket.current.on('answer', (answer) => {
      console.log("I received an answer to my offer");
      connection.current.setRemoteDescription(answer).then(() => {
        console.log("offerer set remote description");
      })
    })

    socket.current.on('iceCandidates', (object) => {
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

    connection.current.addEventListener("icegatheringstatechange", (event) => {
      switch(event.target.iceGatheringState){
        case "gathering":
          console.log("switched to gathering more candidates.");
          break;
        case "complete":
          console.log("finished gathering ice candidates.");
          // emit the array to the server
          socket.current.emit('iceCandidates', {offerer: didIOffer.current, candidates: myCandidates.current});
          break;
        default:
          break;
      }
    })

    connection.current.addEventListener("icecandidate", (event) => {
      if(event.candidate !== null){
        myCandidates.current.push(event.candidate);
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
        socket.current.emit('offer', offer);
        connection.current.setLocalDescription(offer);
      }).then(() => console.log("offerer set local description")).catch((reason) => console.log(reason));
    }
    else{
      connection.current.setRemoteDescription(offer.current).then(() => console.log("answerer set remote description"));
      connection.current.createAnswer().then((answer) => {
        didIOffer.current = false;
        console.log(answer);
        socket.current.emit('answer', answer);
        connection.current.setLocalDescription(answer);
      }).then(() => console.log("answerer set local description")).catch((reason) => console.log(reason));
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
