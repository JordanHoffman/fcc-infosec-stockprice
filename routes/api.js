/*
*
*
*       Complete the API routing below
TODO: If I pass along 2 stocks, the return object will be an array with information about both stocks. Instead of likes, it will display rel_likes (the difference between the likes on both stocks) on both.
*
*/

'use strict';

const https = require('https');
var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectID = require('mongodb').ObjectID

module.exports = function (app, db) 
{
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
        //stock name is not a real-world stock
        if (JSON.parse(data) == "Unknown symbol"){ 
          res.send(JSON.parse(data))
        }
        //stock is a real stock, check if it was liked to see if db stuff needs to be done
        else 
        { 
          //check if stock exists in db. If not, create and add the like. If it does, check if it already has a like for this IP. If not, add the like, but if it does then do nothing.
          db.collection('stocks').findOne({name:requestedStock}, (error, findOneResult)=>
          {
            if (error){res.send("error finding db stock: " + error)} 
            //The stock was liked
            else if (req.query.like)
            {
              var ip = req.header('x-forwarded-for') || req.connection.remoteAddress
              console.log("here's our ip: " + ip)
              ip = ip.split(',')[0]
              //null means collection doesn't exist or stock not found in db, therefore add
              if (findOneResult == null)
              {
                db.collection('stocks').insertOne
                (
                  {name: requestedStock, 
                   likes: [ip]}, 
                  (error, doc)=>
                  {
                    if (error){
                    res.send("error inserting new stock in db: " + error)
                    } else {
                    console.log("succesfully inserted new stock into db! " + doc.ops[0])
                    var returnObject = {"stock": doc.ops[0].name, 
                                        "price": JSON.parse(data).latestPrice, 
                                        "likes":1 }
                    res.send(returnObject)
                    }
                  }
                )
              }
              //The stock exists in the db. Check if IP is listed in the "likes" array. If it is, do nothing, else add the IP to the array and update the document.
              else 
              { 
                console.log(findOneResult)
                //There's already a like with this ip, do nothing and return generic info
                if (findOneResult.likes.includes(ip))
                { 
                  console.log("ip found")
                  var returnObject = {"stock": findOneResult.name, 
                                      "price": JSON.parse(data).latestPrice, 
                                      "likes":findOneResult.likes.length}
                  res.send(returnObject)
                } 
                //No like exists yet for this ip, so update stock and return updated info
                else 
                { 
                  console.log("ip not found")
                  db.collection("stocks").findOneAndUpdate
                  (
                    {_id:ObjectID(findOneResult._id)}, 
                    {$set: {likes: findOneResult.likes.concat([ip])}},
                    {returnOriginal: false},
                    (error, findAndUpdateResult)=>{
                      if (error) console.log("error updating db: " + error) 
                      else {
                        console.log("succesfully updated db")
                        var returnObject = {"stock": findAndUpdateResult.value.name, 
                                      "price": JSON.parse(data).latestPrice, 
                                      "likes":findAndUpdateResult.value.likes.length}
                        res.send(returnObject)
                      }
                    }
                  )
                }
              }  
            }
            //stock info was given without a like. Check if it exists in db. If it does, return "likes" info from db, otherwise just return 0 for likes.
            else 
            { 
              if(findOneResult==null)
              {
                var returnObject = {"stock": requestedStock, 
                                    "price": JSON.parse(data).latestPrice, 
                                    "likes": 0}
                res.send(returnObject)
              } 
              else 
              {
                var returnObject = {"stock": findOneResult.name, 
                                    "price": JSON.parse(data).latestPrice, 
                                    "likes": findOneResult.likes.length}
                res.send(returnObject)                  
              }
            }
          })
        }
      });
    }).on("error", (err) => {
      console.log("https get error: " + err.message);
    });
  });   
};

