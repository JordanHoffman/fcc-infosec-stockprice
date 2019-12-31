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
  //GOAL: the only purpose of the external website is to get the stock price and verify if its name exists. I need to setup a db which holds stock names, and an array of IP addresses for each like. If a person finds a stock and also likes it, I must check if that name is in the db: if not then add it with the like. If it is already in, then check if the 'like' for that IP exists and if not then add it.
  //Part deau: The second form also submits to the .get. The only difference is that since it has 2 stocks, they come as an array instead of a string. Check for this and handle accordingly, and prepare return object with relative likes (the difference between each stock's likes)
  
//End: it's done. It could easily be refactored more. Overall, lesson learned is that flat if conditionals is preferred to if/else bracket pyramid mayhem. Learn error handling.
  
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

//stockObject comes as {stock:"name", price:"price", likes: 0}
//for this function I used an errorflag instead of traditional try/catch block
async function handleRealStock(req, stockObject){
  return new Promise(async (resolve, reject) =>
  {
    console.log(req.query)
    let errorFlag = false;
    
    //See if stock exists in db
    let findOneResult = await db.collection('stocks').findOne({name:stockObject.stock})
      .catch(findOneError => {reject(findOneError); errorFlag = true})
    if (errorFlag) return
    
    //stock req w/o a like. doesnt exist in db ? return 0 for likes, else return "likes" info from db
    if (!req.query.like){
      stockObject.likes = (findOneResult == null) ? 0 : findOneResult.likes.length
      resolve(stockObject); return
    }
    
    //The stock was liked, get ip info ready
    let ip = req.header('x-forwarded-for') || req.connection.remoteAddress
    console.log("here's our ip: " + ip)
    ip = ip.split(',')[0]
    
    //null result means stock or entire collection doesn't exist in db, therefore add
    if (findOneResult == null)
    {
      let insertedDoc = await db.collection('stocks').insertOne({name: stockObject.stock, likes: [ip]})
        .catch(error => {reject(error); errorFlag = true})
      if (errorFlag) return

      console.log("succesfully inserted new stock into db! " + insertedDoc.ops[0])
      stockObject.likes = 1
      resolve(stockObject); return
    }
    
    //stock exists in db.
    //There's already a like with this ip, do nothing and return generic info
    if (findOneResult.likes.includes(ip))
    { 
      console.log("ip found")
      stockObject.likes = findOneResult.likes.length
      resolve(stockObject); return
    }
    
    //No like exists yet for this ip, so update stock and return updated info
    console.log("ip not found")
    let findAndUpdateResult = await db.collection("stocks").findOneAndUpdate(
          {_id:ObjectID(findOneResult._id)}, 
          {$set: {likes: findOneResult.likes.concat([ip])}},
          {returnOriginal: false}
        ).catch(error => {reject(error); errorFlag = true})
    if (errorFlag) return
    
    console.log("succesfully updated db")
    stockObject.likes = findAndUpdateResult.value.likes.length
    resolve(stockObject); return
  })

}

app.route('/api/stock-prices')
.get(async function (req, res)
{
  //2 stocks submitted from second form
  if (Array.isArray(req.query.stock))
  {
    let requestedStock1 = ("" + req.query.stock[0]).toUpperCase()
    let requestedStock2 = ("" + req.query.stock[1]).toUpperCase()
    let fullURI1 = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock1 + "/quote"
    let fullURI2 = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock2 + "/quote"
    
    let [httpsResult1, httpsResult2] = [null, null]
    try { 
      [httpsResult1, httpsResult2] = await Promise.all([httpsPromise(fullURI1), httpsPromise(fullURI2)])
    } catch (error) {
      console.log("https error for 2 stocks: " + error)
      res.send("https error for 2 stocks: " + error); return
    }
    
    if (!IsValidJSONString(httpsResult1) || !IsValidJSONString(httpsResult2) ){
      console.log("Unexpected result from https request: " + httpsResult1 + httpsResult2)
      res.send({errorResult:(httpsResult1 + " " + httpsResult2)}); return
    }
    
    //Non-error results returned at this point, prepare returnObjects
    //ex return: {"stockData":[{"stock":"GOOG","price":1360.4,"rel_likes":0},{"stock":"AAPL","price":289.91,"rel_likes":0}]}
    let returnObject1 = {"stock":"Unknown/Invalid symbol", "price":"N/A", "likes":0}
    let returnObject2 = {"stock":"Unknown/Invalid symbol", "price":"N/A", "likes":0}
    
    let parseResult1 = JSON.parse(httpsResult1) 
    let parseResult2 = JSON.parse(httpsResult2) 
    
    //stock is a real stock
    if (parseResult1 != "Unknown symbol" && parseResult1 != "Invalid symbol" )
    { 
      try { returnObject1 = await handleRealStock(req, {stock: requestedStock1, price: parseResult1.latestPrice, likes: 0})
      } catch (e) {
        res.send(e)
        return
      }
    }
    
    if (parseResult2 != "Unknown symbol" && parseResult2 != "Invalid symbol" )
    { 
      try { returnObject2 = await handleRealStock(req, {stock: requestedStock2, price: parseResult2.latestPrice, likes: 0})
      } catch (e) {
        res.send(e)
        return
      }
    }    
    
    let finalObject1 = {"stock": returnObject1.stock, "price": returnObject1.price, "rel_likes": (returnObject1.likes - returnObject2.likes)}
    let finalObject2 = {"stock": returnObject2.stock, "price": returnObject2.price, "rel_likes": (returnObject2.likes - returnObject1.likes)}
    
    res.send({"stockData": [finalObject1, finalObject2]})
    return
  }
  
  //1 stock submitted from first form
  let requestedStock = ("" + req.query.stock).toUpperCase()
  let fullURI = "https://repeated-alpaca.glitch.me/v1/stock/" + requestedStock + "/quote"

  let httpsResult
  try {
    httpsResult = await httpsPromise(fullURI)
  } catch(e) {
    res.send(e)
    return
  }

  //something not JSON parseable returned from "https://repeated-alpaca.glitch.me/v1/stock/", shouldn't happen
  if (!IsValidJSONString(httpsResult)){
    console.log("Unexpected result from https request: " + httpsResult)
    res.send({errorResult:httpsResult}); return
  }

  //stock is not a real stock
  if (JSON.parse(httpsResult) == "Unknown symbol" || JSON.parse(httpsResult) == "Invalid symbol" ){ 
    res.send({"stockData": {"stock": "Unknown/Invalid symbol", "price": "N/A", "likes": 0}}); return
  }

  //stock is a real stock
  let stockPrice = JSON.parse(httpsResult).latestPrice
  let returnObject = {"stock": requestedStock, "price": stockPrice, "likes":0}
  
  let finalStockObject
  try {
    finalStockObject = await handleRealStock(req, returnObject)
  } catch(e) {
    res.send(e)
    return
  }
  res.send({"stockData":finalStockObject})
  return
})
      
}; //end of export of file

