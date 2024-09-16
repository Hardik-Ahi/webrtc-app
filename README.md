# What is this?

A simple video conferencing application that enables two peers to connect to each other with their audio-video streams.<br>
Created using React.js.<br>
It uses WebRTC (Web Real-Time Collaboration) as the underlying technology to connect two peers.<br>
Uses socket.io for the signaling server.

# How to use it?

Extra tools needed: Ngrok.

1. Clone this repo.
2. Make sure you are on the branch 'trickle', the one with the latest changes.
3. Delete the 'package-lock.json' files wherever you see them.
4. Go to each directory that contains a 'package.json' file, and run 'npm install' there.
5. Add a '.env' file in the root of this project, and declare this variable in it:
    1. REACT_APP_SERVER_URL: paste your Ngrok url for the server (server.js). It is recommended that you make this url permanent by creating a free account on Ngrok. The local url for the server will be 'http://localhost:5000'.
6. Add a '.env' file in the directory 'signaling_server', and declare this variable in it:
    1. REACT_APP_NGROK_URL: paste your Ngrok url for the client (App.js). This url will change each time you run Ngrok, if you are using the free version. The local url for the client will be 'https://localhost:3000'.
7. Set up 'https' for your localhost (client), since it is required to access the camera / microphone of the user.
8. In the 'signaling_server' directory, run 'npm install nodemon' and 'npm install dotenv' if they are not already installed.
9. Start the Ngrok tunnels to your client and server.
10. Start the server by running 'nodemon server.js' in the 'signaling_server' directory.
11. Run 'npm start' in the 'src' directory to start the client.
12. Go to 'https://localhost:3000' to access the client (App.js).
13. In another tab, go to the same localhost url. Alternatively, go to the url of the client as determined by Ngrok, on a different device (such as a mobile phone).
14. Click 'open connection' on one of the clients.
15. The other client's button should now say 'answer connection'. Click on that.
16. The two clients should quickly be connected and be able to receive each other's audio/video streams.
17. Click on 'close connection' on any of the clients to terminate the connection.
18. You can re-connect without reloading the webpage. Repeat steps 14-16 to reconnect.

# Inspired by

Youtube: https://youtu.be/g42yNO_dxWQ?si=4G2NeL-27lQdl5ca