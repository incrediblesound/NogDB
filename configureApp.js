const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const session = require('express-session');

const configureApp = () => {
  const app = express()

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }))

  // parse application/json
  app.use(bodyParser.json())

  app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'airborn filamentous'
  }));

  return app
}

module.exports = configureApp