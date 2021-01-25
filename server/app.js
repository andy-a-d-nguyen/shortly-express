const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(require('./middleware/cookieParser'));
app.use(Auth.createSession);

app.get('/', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession, (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', Auth.verifySession, (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/logout', (req, res) => {

});

app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;

  // find user by username
  models.Users.get({username})
    .then(user => {
      // if not found or not valid password
      if (!user || !models.Users.compare(password, user.password, user.salt)) {
        // redirect to /login
        throw user;
      }

      return models.Sessions.update({id: req.session.id}, {userId: user.id});
    })
    .then(() => {
      // otherwise, redirect to /
      res.redirect('/');
    })
    .catch(() => {
      res.redirect('/login');
    });
});

app.post('/signup', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;

  // check if user exist
  models.Users.get({username})
    .then(user => {
      // if exists, redirect to signup
      if (user) {
        // redirect to /signup
        throw user;
        // by throwing, the next 2 then() blocks are skipped and the code execution goes to the catch() block
        // if res.redirect() was invoked here, the next 2 then() blocks and line 108 will still be executed
      }
      // otherwise, create a user
      return models.Users.create({username, password});
    })
    .then(results => {
      // upgrade session associated with user
      return models.Sessions.update({id: req.session.id}, {userId: results.insertId});
      // return models.Sessions.update({hash: req.session.hash}, {userId: results.insertId}); ===> another way to identify the user is through the hash
    })
    .then(user => {
      // redirect user to / route
      res.redirect('/');
    })
    .catch(user => {
      res.redirect('/signup');
    });
  // error() block is used to handle errors / when a promise is rejected
  // catch() block is used to handle exceptions or errors
});
/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
