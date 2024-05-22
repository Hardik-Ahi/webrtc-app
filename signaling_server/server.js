const express = require('express')
const http = require('http')  // built-in module
const socketIO = require('socket.io')
const port = 5000
const cors = require('cors')

const app = express()
app.use(cors({
    origin: ['https://192.168.0.106:3000', 'https://localhost:3000']
}))

app.get('/', (req, res) => {
    res.send("hello world");
})

const server = http.createServer(app);  // 'app' is actually a function => callback function
// 'app' can be passed to both http and https, thus we can use the same app configuration on http and https.

const io = socketIO(server, {
    cors: {
        origin: '*'
    }
});
let clientOffer = null;
let clientAnswer = null;
let offererCandidates = [];
let answererCandidates = [];

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

    socket.on('iceCandidates', (object) => {
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
    })
})

server.listen(port, () => {
    console.log(`server listening on ${port}`);
})