    var dns = require('native-dns'),
        express = require('express'),
        util = require('util'),
        redis = require('redis'),
        bodyParser = require('body-parser'),
        _ = require('underscore'),
        Q = require ('q');

    var app = express();
    var logger = util.debuglog('logger');  //NODE_DEBUG=logger node app.js

    app.use(bodyParser.urlencoded({ extended: false }))  // parse application/x-www-form-urlencoded
       .use(bodyParser.json());                          // parse application/json

    app.get('/get/:host', function(req, res){
        var host = req.param('host');

        lookup(host)
            .then(function(addr){
                console.log(addr);
                res.send(addr);
            })
            .catch(function(error){
                console.log(error);
            });
    });

    app.post('/register/', function(req, res){

        if(_.isUndefined(req.body.host) || _.isUndefined(req.body.addr)){
            res.error('Wrong access!!');
        }

        var host = req.body.host,
            addr = req.body.addr;
        console.log(host, addr);
        redisClient.set(host, addr, function(err, didSucceed){
            if(err){
                res.error(err);
            }

            res.send({status: didSucceed});
        });

    });

    app.delete('/del/', function(req, res){

    });

    app.delete('/flush', function(req, res){
        redisClient.flushall(function(err, didSucceed){
            if(err){
                logger(err);
                res.error(err);
            }
            res.send({status: didSucceed});
        });
    });

    var server = dns.createServer();
    var redisClient = redis.createClient(6379, 'localhost');

    server.on('request', function (req, res) {

        lookup( req.question[0].name )
            .then(function(addr){
                logger(addr);
                res.answer.push(dns.A({
                    name: req.question[0].name,
                    address: addr,
                    ttl: 600,
                }));

            })
            .catch(function(error){
                logger('error');
                logger(error);
            })
            .done(function(){
                res.send();
                logger('Send!!!');

            });
    });

    server.on('error', function (err, buff, req, res) {
        logger(err.stack);
    });


    server.serve(53);

    app.listen(55555, function(){
        logger('This server is running on the port ' + this.address().port);
    });

    function lookup( req_site ){
        var d = Q.defer();
        logger(req_site);
        redisClient.on("error", function(err){
            d.reject();
            console.log("Error " + err);
            //redisClient.quit();
        });

        redisClient.get( req_site, function(err, reply){
            if(err){
                d.reject();
            }else{
                if(!reply) d.reject();
                d.resolve(reply);
                //redisClient.quit();
            }
        });

        return d.promise;
    }