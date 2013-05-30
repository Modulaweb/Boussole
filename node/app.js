
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , util = require('util')
  , RedisStore = require('connect-redis')(express)
  , redis_ = require("redis")
  , redis = redis_.createClient()

  , user = require('./routes/user')
  , boussole = require('./boussole/boussole')
  ;
redis.flushall();
app = express();

app.configure(function(){
  app.use(function(req,res,next){
    res.removeHeader("X-Powered-By");
    next();
  });
  app.use(express.logger('dev'));
  app.use(express.compress());
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('Boussole Trouvez Votre Chemin Secret'));
  app.use(express.session({ store: new RedisStore({prefix:'session_'}), secret: 'Boussole Trouvez Votre Chemin Secret' }));
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public/stylesheets' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', boussole.index);
app.get('/api/:key/:action', boussole.api);
app.get('/users', user.list);
app.post('/feedback',boussole.feedback);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
