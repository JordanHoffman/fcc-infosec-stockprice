'use strict';

var express     = require('express');
var bodyParser  = require('body-parser');
var expect      = require('chai').expect;
var cors        = require('cors');

var apiRoutes         = require('./routes/api.js');
var fccTestingRoutes  = require('./routes/fcctesting.js');
var runner            = require('./test-runner');
var MongoClient = require('mongodb').MongoClient;

var app = express();

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

MongoClient.connect(process.env.DATABASE, {useUnifiedTopology:true}, (err, client) => 
{
  //IMPORTANT: this code is now updated for Mongo 3.0 where the connect function now returns the client and the db comes from the client
  if(err) 
  {
    console.log('Database error: ' + err);
  } else 
  {
    var db = client.db('AdvNodeExpressDBChallenges')
    console.log('Successful database connection');
    //Index page (static HTML)
    app.route('/')
      .get(function (req, res) {
        res.sendFile(process.cwd() + '/views/index.html');
      });

    //For FCC testing purposes
    fccTestingRoutes(app, db);

    app.use(function(req, res, next) {
      console.log(req.originalUrl);
      next();
    })

    //Routing for API 
    apiRoutes(app);  

    //404 Not Found Middleware
    app.use(function(req, res, next) {
      res.status(404)
        .type('text')
        .send('Not Found');
    });

    //Start our server and tests!
    app.listen(process.env.PORT || 3000, function () {
      console.log("Listening on port " + process.env.PORT);
      if(process.env.NODE_ENV==='test') {
        console.log('Running Tests...');
        setTimeout(function () {
          try {
            runner.run();
          } catch(e) {
            var error = e;
              console.log('Tests are not valid:');
              console.log(error);
          }
        }, 3500);
      }
    });

    module.exports = app; //for testing
  }
})
