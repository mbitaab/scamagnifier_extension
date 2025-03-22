const express = require('express')
const session = require('express-session')
const body_parser = require('body-parser');
const repos = require('./repository/repository')
const server = express();
const cors = require('cors');

server.use(body_parser.text({type: 'text/plain'}));
const controller_merchant = require('./controller/controller_merchant')
const controller_report = require('./controller/controller_report')

server.use(cors());

const create_server = function () {
    let repository = new repos()
    repository.init()

    let sessionMiddleware = session({
        key: 'user_sid',
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            expires: 600000
        }
    });
    //server.use(sessionMiddleware);

    // Routing table
    server.use("/merchant",controller_merchant)
    server.use("/report",controller_report)
    //server.use("/update",controller_domain)

    return server
}

module.exports = create_server