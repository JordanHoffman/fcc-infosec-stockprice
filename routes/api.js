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
  //GOAL: the only purpose of the external website is to get the stock price and verify if its name exists. I need to setup a db which holds stock names, their likes, and the IP address of each like (so like will probably be an object) and likes will be an array of IP addresses. If a person finds a stock and also likes it, I must check if that name is in the db: if not then add it with the like. If it is already in, then check if the 'like' for that IP exists and if not then add it.
  //Part deau: The second form also submits to the .get. The only difference is that since it has 2 stocks, they come as an array instead of a string. Check for this and handle accordingly... I gotta freakin refactor stuff into methods to work for both cases. This stuff is begging for promises.
function IsValidJSONString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
  
function httpsPromise(fullURI) {
  return new Promise((resolve, reject) =>{
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
        resolve(data)
      })
    }).on("error", (err) => {
      reject(err);
    });
  }) 
}

app.route('/api/stock-prices')
  .get(function (req, res)
  {
    useRefactored(req, res)
  })
       
async function useRefactored(req, res)
{
  //2 stocks submitted from second form
  if (Array.isArray(req.query.stock))
  {
    let requestedStock1 = ("" + req.query.stock[0]).toUpperCase()
    let requestedStock2 = ("" + req.query.stock[1]).toUpperCase()
    var fullURI1 = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock1 + "/quote"
    var fullURI2 = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock2 + "/quote"
    Promise.all([httpsPromise(fullURI1), httpsPromise(fullURI2)]).then(
      result => {
        //this result will be an array of the 2 stock infos
        console.log("yay promise worked: " + result)
        res.end(); return
      },
      error => {
        console.log(error)
        res.end(); return
      }
    )  
  }
  
  //1 stock submitted from first form
  let requestedStock = ("" + req.query.stock).toUpperCase()
  var fullURI = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock + "/quote"

  //catch will get reject from promise. Without catch, if there was a reject, then httpsResult would be undefined.
  let httpsResult = await httpsPromise(fullURI)
    .catch((httpsErr) => {
      console.log("uh oh error in https: " + httpsErr) 
      res.send(httpsErr); return
    })

  //console log here with error to see if code still executing past return

  //something not JSON parseable returned from "https://repeated-alpaca.glitch.me/v1/stock/", shouldn't happen
  if (!IsValidJSONString(httpsResult)){
    console.log("Unexpected result from https request: " + httpsResult)
    res.send({errorResult:httpsResult}); return
  }

  // console.log("yay promise worked: " + typeof(httpsResult) + " " + httpsResult)

  //stock is not a real stock
  if (JSON.parse(httpsResult) == "Unknown symbol"){ 
    res.send(JSON.parse(httpsResult)); return
  }

  //stock is a real stock
  let stockPrice = JSON.parse(httpsResult).latestPrice
  let returnObject = {"stock": requestedStock, "price": stockPrice, "likes":0}

  //See if stock exists in db
  let findOneResult = await db.collection('stocks').findOne({name:requestedStock})
    .catch((findOneError)=>{
      res.send("error finding db stock: " + findOneError)
      return
    })

  //stock req w/o a like. doesnt exist in db ? return 0 for likes, else return "likes" info from db
  if (!req.query.like){
    returnObject.likes = (findOneResult == null) ? 0 : findOneResult.likes.length
    res.send(returnObject); return
  }

  //The stock was liked, get ip info ready
  var ip = req.header('x-forwarded-for') || req.connection.remoteAddress
  console.log("here's our ip: " + ip)
  ip = ip.split(',')[0]

  //null result means stock or entire collection doesn't exist in db, therefore add
  if (findOneResult == null)
  {
    let insertedDoc = await db.collection('stocks').insertOne({name: requestedStock, likes: [ip]})
      .catch((error)=>{res.send("error inserting new stock in db: " + error); return})

    console.log("succesfully inserted new stock into db! " + insertedDoc.ops[0])
    res.send({"stock": requestedStock, "price": stockPrice, "likes":1 }); return
  }

  //stock exists in db.
  console.log(findOneResult)
  //There's already a like with this ip, do nothing and return generic info
  if (findOneResult.likes.includes(ip))
  { 
    console.log("ip found")
    returnObject.likes = findOneResult.likes.length
    res.send(returnObject); return
  } 

  //No like exists yet for this ip, so update stock and return updated info
  console.log("ip not found")
  let findAndUpdateResult = await db.collection("stocks").findOneAndUpdate(
        {_id:ObjectID(findOneResult._id)}, 
        {$set: {likes: findOneResult.likes.concat([ip])}},
        {returnOriginal: false}
      ).catch((error)=>{
        res.send("error updating db: " + error); return
      })

  console.log("succesfully updated db")
  returnObject.likes = findAndUpdateResult.value.likes.length
  res.send(returnObject)
  return
} //end of refactored function
      
}; //end of export of file

