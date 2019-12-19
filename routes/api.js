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
      let requestedStock = ("" + req.query.stock).toUpperCase()
      // console.log(requestedStock)
      var fullURI = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock + "/quote"
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
          // console.log(JSON.parse(data));
          if (JSON.parse(data) == "Unknown symbol"){ //stock name is not a real-world stock
            console.log("we got an unkown!!")
          }
          else //stock name is a real-world stock, check if it was liked to see if db stuff needs to be done
          { 
            if (req.query.like)
            {
              //check if stock name exists in db. If not, create and add the like. If it does, check if it already has a like for this IP. If not, add the like, but if it does then do nothing.
              db.collection('stocks').findOne({name:requestedStock}, (error, result)=>{
                if (error){
                  console.log("error finding db stock: " + error)
                } else {
                  //returns null if collection doesn't exist or no stock doc found in db, in which case we add
                  if (result == null)
                  {
                    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress
                    // console.log(ip)
                    ip = ip.split(',')[0]
                    db.collection('stocks').insertOne
                    (
                      {
                        name: requestedStock,
                        likes: [ip]
                      },
                      (error, doc)=>
                      {
                        if (error){
                          console.log("error inserting new stock in db: " + error)
                        } else {
                          console.log("succesfully inserted new stock into db! " + doc.ops[0])
                          //doc object will be returned here. I don't think I have to do anything with it though
                        }
                      }
                    )
                  }
                  //The stock doc exists in the db. I need to see if the IP is listed in the "likes" array. It it is, do nothing, otherwise add the IP to the array and update the document.
                  else { 
                    
                  }
                  
                }
              })
            }          }

                    res.send(data)
        });

      }).on("error", (err) => {
        console.log("Error: " + err.message);
      });
    });
    
};

