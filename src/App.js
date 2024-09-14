import React, {useEffect, useRef, useState, useCallback} from 'react';
import {io} from 'socket.io-client';
import './page.css';

function App() {
  const localStream = useRef(null);  // for directly manipulating DOM elements; otherwise they are considered react components
  const remoteStream = useRef();
  const remoteTrack = useRef(new MediaStream());
  const connection = useRef(null);  // RTCPeerConnection
  const offer = useRef(null);

  const socket = useRef(null);
  const [canOffer, setCanOffer] = useState(false);  // using 'useState' because change in this should trigger re-render (button)
  const didIOffer = useRef(false);

  const offererIndex = useRef(-1);  // represents the index till which we have processed the candidates.
  const answererIndex = useRef(-1);
  
  const requestPermission = useCallback(async() => {
    const constraints = {
      audio: true,
      video: true
    }
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      localStream.current.srcObject = stream;
    }, (reasonForFailure) => {
      console.log(reasonForFailure);
    })
  }, []);  // no dependencies => never changes.

  const socketSetup = useCallback(() => {
    //socket.current = io('http://localhost:5000')
    socket.current = io(process.env.REACT_APP_SERVER_URL, {
      extraHeaders: {
        "ngrok-skip-browser-warning": 5500
      }
    })

    socket.current.on('offerAvailable', (status) => {
      setCanOffer(status.status);
      offer.current = status.offer;
    })

    socket.current.on('answer', (answer) => {
      connection.current.setRemoteDescription(answer).then(() => {
        socket.current.emit('sendAnswererCandidates');
      })
    })

    socket.current.on('offererCandidate', (offererCandidates) =>{
      offererIndex.current = offererIndex.current + 1;
      while(offererIndex.current < offererCandidates.candidates.length){
        const candidate = offererCandidates.candidates[offererIndex.current];
        connection.current.addIceCandidate(new RTCIceCandidate(candidate)).then(() => {})
        offererIndex.current = offererIndex.current + 1;
      }
      offererIndex.current = offererIndex.current - 1;
    })
    
    socket.current.on('answererCandidate', (answererCandidates) => {
      answererIndex.current = answererIndex.current + 1;
      while(answererIndex.current < answererCandidates.candidates.length){
        const candidate = answererCandidates.candidates[answererIndex.current];
        connection.current.addIceCandidate(new RTCIceCandidate(candidate)).then(() => {})
        answererIndex.current = answererIndex.current + 1;
      }
      answererIndex.current = answererIndex.current - 1;
    })
  }, []);  // ESlint says no errors here => never changes.

  useEffect(() => {
    requestPermission();
    socketSetup();

    return () => {
      socket.current.disconnect();
    }
  }, [requestPermission, socketSetup]);  // but we know, these will always be memoized, thus will never change => never re-renders based on these.

  const onOpenConnection = (event) => {
    connection.current = new RTCPeerConnection({
      iceServers: [{
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"]
      }]
    });

    // guess: gathering this starts only after setLocalDescription(), so didIOffer should work fine.
    connection.current.addEventListener("icecandidate", (event) => {
      if(event.candidate !== null){
        socket.current.emit(didIOffer.current ? 'offererCandidate' : 'answererCandidate', event.candidate);
      }
    })

    localStream.current.srcObject.getTracks().forEach((item, index) => {
      connection.current.addTrack(item);
    })
    
    if(canOffer){
      connection.current.createOffer().then((offer) => {
        didIOffer.current = true;
        return connection.current.setLocalDescription(offer);
      }).then(() => {
        socket.current.emit('offer', connection.current.localDescription);
      }).catch((reason) => console.log(reason));
    }
    else{
      connection.current.setRemoteDescription(offer.current).then(() => {
        return connection.current.createAnswer();
        }).then((answer) => {
          didIOffer.current = false;
          return connection.current.setLocalDescription(answer);
        }).then(() => {
          socket.current.emit('answer', connection.current.localDescription);
          socket.current.emit('sendOffererCandidates');
        }).catch((reason) => console.log(reason));
    }

    connection.current.addEventListener('track', (event) => {
      // this fires 2 times: once for camera track, once for microphone track
      remoteTrack.current.addTrack(event.track);
      remoteStream.current.srcObject = remoteTrack.current;
    });

    connection.current.addEventListener('connectionstatechange', (event) => {
      if(connection.current.connectionState === "disconnected"){
        disableRemoteStream();
        connection.current.close();
      }
    })
  }

  const disableRemoteStream = () => {
    remoteTrack.current.getTracks().forEach((track) => {
      remoteTrack.current.removeTrack(track);
    })
    remoteStream.current.srcObject = null;

    offererIndex.current = -1;
    answererIndex.current = -1;
  }

  const onCloseConnection = (event) => {
    try{
      disableRemoteStream();
      connection.current.close();
      socket.current.emit('close');
    }
    catch(e){
      console.log(e);
    }
  }

  
  return <div id = 'root'>
  <div id = 'video-panel'>
    <video className = 'video' ref = {localStream} controls autoPlay width = "300" height = "200"></video>
    <video className = 'video' ref = {remoteStream} controls autoPlay width = "300" height = "200"></video>
  </div>
  <div id = "button-panel">
  <button className = 'callButton' id = 'openConnection' onClick = {onOpenConnection}>{canOffer ? 'Open Connection' : 'Answer Connection'}</button>
  <button className = 'callButton' id = 'closeConnection' onClick = {onCloseConnection}>Close Connection</button>
  </div>
  </div>;
}

export default App;
