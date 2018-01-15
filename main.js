'use strict';

const http = require('http');
const fs = require("fs");

var base_html = fs.readFileSync("main.html");

http.createServer(function (req, res) {
        res.write(base_html); //write a response to the client
        res.end(); //end the response
    }).listen(8080); //the server object listens on port 8080

console.log("Listening on port 8080");
console.log("Open the following url in a web browser: http://localhost:8080");