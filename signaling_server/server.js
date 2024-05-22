const express = require('express')
const http = require('http')  // built-in module
const socketIO = require('socket.io')
const port = 5000
const cors = require('cors')

const origins = ['https://192.168.0.106:3000', 'https://localhost:3000']
const app = express()
app.use(cors({
    origin: origins
}))

app.get('/', (req, res) => {
    res.send("hello world");
})

const server = http.createServer(app);  // 'app' is actually a function => callback function
// 'app' can be passed to both http and https, thus we can use the same app configuration on http and https.

const io = socketIO(server, {
    cors: {
        origin: origins
    }
});
let clientOffer = null;
let clientAnswer = null;
let offererCandidates = [];
let answererCandidates = [];
let sendOffererCandidates = false;
let sendAnswererCandidates = false;

io.on('connection', (socket) => {
    console.log("some one connected");
    socket.emit("offerAvailable", {status: clientOffer === null ? true: false, offer: clientOffer});

    socket.on('disconnect', (reason) => {
        console.log(reason);
    });
    
    socket.on('offer', (offer) => {  // custom event using socket.emit('offer', offer) => offer is the thing we need
        if(clientOffer === null){
            console.log("first offer received");
            clientOffer = offer;
            socket.broadcast.emit("offerAvailable", {status: clientOffer === null ? true: false, offer: clientOffer});
        }
        else{
            // this will never execute, because of the way client code is written.
            console.log("second client trying to create offer (not permitted)");
        }
    })

    socket.on('answer', (answer) => {
        if(clientOffer === null){
            console.log("trying to create answer before offer created (not permitted)");
        }
        else{
            console.log("answer received: sewing complete");
            clientAnswer = answer;
            socket.broadcast.emit('answer', clientAnswer);  // offerer should now get the answer
        }
    })

    /*socket.on('iceCandidates', (object) => {
        const offerer = object.offerer;
        if(offerer){
            offererCandidates = [...object.candidates];
        }
        else{
            answererCandidates = [...object.candidates];
        }
        console.log("received some ice candidates");
        console.log("lengths: "+offererCandidates.length+" "+answererCandidates.length+" from " + offerer);
        if(offererCandidates.length > 0 && answererCandidates.length > 0){
            console.log("starting to emit");
            io.emit('iceCandidates', {offererCandidates: offererCandidates, answererCandidates: answererCandidates});
        }
    })*/

    // let answerer tell us when it is ready to start receiving the trickle of offerer's ice candidates 
    socket.on('sendOffererCandidates', () => {
        sendOffererCandidates = true;
        socket.emit('offererCandidate', {candidates: offererCandidates});  // emit this to answerer for the first time.
    })
    
    socket.on('sendAnswererCandidates', () => {
        sendAnswererCandidates = true;
        socket.emit('answererCandidate', {candidates: answererCandidates});  // emit this to answerer for the first time.
    })

    socket.on('offererCandidate', (candidate) => {
        console.log("length of offerer array: "+offererCandidates.length);
        offererCandidates.push(candidate);
        if(sendOffererCandidates){
            socket.broadcast.emit('offererCandidate', {candidates: offererCandidates});  // answerer may not be receiving this broadcast initially
        }
    })
    
    socket.on('answererCandidate', (candidate) => {
        console.log("length of answerer array: "+answererCandidates.length);
        answererCandidates.push(candidate);
        if(sendAnswererCandidates){
            socket.broadcast.emit('answererCandidate', {candidates: answererCandidates});  // offerer must receive this, else setup fails.
        }
    })


})

server.listen(port, () => {
    console.log(`server listening on ${port}`);
})