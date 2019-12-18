/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const https = require('https');
var expect = require('chai').expect;
var MongoClient = require('mongodb');

module.exports = function (app, db) {

  //GOAL: the only purpose of the external website is to get the stock price and verify if its name exists. I need to setup a db which holds stock names, their likes, and the IP address of each like (so like will probably be an object) and likes will be an array of 'like' objects. If a person finds a stock and also likes it, I must check if that name is in the db: if not then add it with the like. If it is already in, then check if the 'like' for that IP exists and if not then add it. Be careful Bordan!!! Make backups b/c this stuff is screwy.
  app.route('/api/stock-prices')
    .get(function (req, res)
    {
      // console.log(req.query.stock)
      var fullURI = "https://repeated-alpaca.glitch.me/v1/stock/" + req.query.stock + "/quote"
      https.get(fullURI, (resp) => 
      {
        let data = '';

        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
          data += chunk;
        });

        // The whole response has been received.
        //ex return: {"stockData":{"stock":"GOOG","price":1354.71,"likes":1}}
        resp.on('end', () => {
          console.log(JSON.parse(data));
          res.send(data)
        });

      }).on("error", (err) => {
        console.log("Error: " + err.message);
      });
    });
    
};
