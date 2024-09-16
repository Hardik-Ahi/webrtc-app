const express = require('express')
const http = require('http')  // built-in module
const socketIO = require('socket.io')
const port = 5000
const cors = require('cors')

require('dotenv').config()

const origins = ['https://192.168.0.106:3000', 'https://localhost:3000', process.env.REACT_APP_NGROK_URL]
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
            // this also will never execute, because of the way client code is written.
            console.log("trying to create answer before offer created (not permitted)");
        }
        else{
            console.log("answer received: sewing complete");
            clientAnswer = answer;
            socket.broadcast.emit('answer', clientAnswer);  // offerer should now get the answer
        }
    })

    // let answerer tell us when it is ready to start receiving the trickle of offerer's ice candidates 
    socket.on('sendOffererCandidates', () => {
        sendOffererCandidates = true;
        socket.emit('offererCandidate', {candidates: offererCandidates});  // emit this to answerer for the first time.
    })
    
    socket.on('sendAnswererCandidates', () => {
        sendAnswererCandidates = true;
        socket.emit('answererCandidate', {candidates: answererCandidates});  // emit this to offerer for the first time.
    })

    socket.on('offererCandidate', (candidate) => {
        offererCandidates.push(candidate);
        if(sendOffererCandidates){
            socket.broadcast.emit('offererCandidate', {candidates: offererCandidates});  // answerer may not be receiving this broadcast initially
        }
    })
    
    socket.on('answererCandidate', (candidate) => {
        answererCandidates.push(candidate);
        if(sendAnswererCandidates){
            socket.broadcast.emit('answererCandidate', {candidates: answererCandidates});  // offerer must receive this, else setup fails.
        }
    })

    socket.on('close', () => {
        clientOffer = null;
        clientAnswer = null;
        offererCandidates = [];
        answererCandidates = [];
        sendOffererCandidates = false;
        sendAnswererCandidates = false;
        io.emit("offerAvailable", {status: clientOffer === null ? true: false, offer: clientOffer});
    })

})

server.listen(port, () => {
    console.log(`server listening on ${port}`);
    console.log(process.env.REACT_APP_NGROK_URL);
})