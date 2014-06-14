var socketio = require("socket.io");

var express = require("express");

var cookieParser = require('cookie-parser');
var session      = require('express-session');

var MemoryStore = session.MemoryStore;
console.log(MemoryStore);

//var RedisStore = require('connect-redis')(session);

var redis = require("redis");

var fs = require("fs");

var app = express();
var port = 3005;

var nextsid = 0;



var http = require('http').Server(app);
var io = require('socket.io')(http);



// express


var router = express.Router();

var cp = cookieParser("secret1");

var sessionStore = new MemoryStore({
  });

var sesFun = session({
  secret: "secret1",
  store: sessionStore
});

router.use(cp);
router.use(sesFun);

// home page route (http://localhost:8080)
router.get('/', ensureAuthenticated, function(req, res) {
  res.setHeader('Content-Type', "text/html");
  fs.readFile(__dirname + "/../src/index.html", function(err, data){
    if (err){
      res.end(err);
      return;
    };
    var sess = req.session;
    if (!sess.sid){
      sess.sid = ++nextsid;
    };
    console.log(sess);
    console.log(sess.sid);
    var s = data.toString();
    s = s.replace(/{{{sessioninfo}}}/g, sess.sid);
    res.end(s);
  });
});

router.use("/", express["static"](__dirname + "/../src/"));


// apply the routes to our application
app.use('/', router);



// socket.io


io.use(function(socket, next){
  var req = socket.request;
  cp(req, {}, next);
  //next();
});

function findCookie(handshake, key) {
  if (handshake)
    return (handshake.secureCookies && handshake.secureCookies[key]) ||
      (handshake.signedCookies && handshake.signedCookies[key]) ||
      (handshake.cookies && handshake.cookies[key]);
}

var coockieId = 'connect.sid';


io.use(function(socket, next){
  var req = socket.request;

  sessionStore.load(findCookie(req, coockieId), function (storeErr, session) {
    req.session = session;
    next();
  });
  
});

io.on('connection', function(socket){
  var req = socket.request;
  console.log('a user connected');
  console.log(req.session);
  console.log("---");
  //console.log(socket.request);
});



// passport

var passport = require('passport');
var GoogleStrategy = require('passport-google').Strategy;



// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});



// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
    returnURL: "http://192.168.0.106:" + port + "/auth/google/return",
    realm: "http://192.168.0.106:" + port + "/"
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

router.use(passport.initialize());
router.use(passport.session());









router.get('/login', function(req, res){
  //res.sendfile(__dirname + "/../src/login.html");
  res.sendfile("src/login.html");
  return;
  res.end("haha");
  return;
  res.render('login', { user: req.user });
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authenticating, Google will redirect the
//   user back to this application at /auth/google/return
router.get('/auth/google', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

// GET /auth/google/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/auth/google/return', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});



// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}


http.listen(port);