/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let likes = 0;
    
    suite('GET /api/stock-prices => stockData object', function() {
      
      test('1 stock', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'goog'})
        .end(function(err, res){
           if (err) assert.fail(err)
           else{
             assert.property(res.body, 'stockData')
             assert.property(res.body.stockData, 'stock')
             assert.property(res.body.stockData, 'price')
             assert.property(res.body.stockData, 'likes')
           }
          done();
        });
      });
      
      test('1 stock with like', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'goog', like: 'true'})
        .end(function(err, res){
           if (err) assert.fail(err)
           else{
             assert.property(res.body, 'stockData')
             assert.property(res.body.stockData, 'stock')
             assert.property(res.body.stockData, 'price')
             assert.property(res.body.stockData, 'likes')
             likes = res.body.stockData.likes
           }
          done();
        });
      });
      
      test('1 stock with like again (ensure likes arent double counted)', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'goog', like: 'true'})
        .end(function(err, res){
           if (err) assert.fail(err)
           else{
             assert.equal(res.body.stockData.likes, likes, "likes aren't double counted")
           }
          done();
        });      
      });
      
      test('2 stocks', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['goog','msft']})
        .end(function(err, res){
           if (err) assert.fail(err)
           else{
             assert.property(res.body, 'stockData')
             assert.isArray(res.body.stockData)
             res.body.stockData.forEach( stock =>{
               assert.property(stock, 'stock')
               assert.property(stock, 'price')
               assert.property(stock, 'rel_likes')  
             })
           }
          done();
        });   
      });
      
      test('2 stocks with like', function(done) {
        chai.request(server)
          .get('/api/stock-prices')
          .query({stock: ['goog','msft'], like:'true'})
          .end(function(err, res){
             if (err) assert.fail(err)
             else{
               assert.property(res.body, 'stockData')
               assert.isArray(res.body.stockData)
               res.body.stockData.forEach( stock =>{
                 assert.property(stock, 'stock')
                 assert.property(stock, 'price')
                 assert.property(stock, 'rel_likes')  
               })
             }
            done();
          });   
      });
      
    });

});
