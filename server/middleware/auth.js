const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {

  // check for session cookie
  Promise.resolve(req.cookies.shortlyid)
    .then(hash => {
    // if session cookie doesn't exist
      if (!hash) {
        // make a new session
        throw hash; // throw an error and go to the catch block where error handling occurs
      }
      // attempt to load session from database
      return models.Sessions.get({hash}) // returns a promise or a value to the next then block / asynchronous function
    })
    .then(session => {
      // if session doesn't exist in database
      if (!session) {
        // make a new session
        throw session; // throw an error and go to the catch block where error handling occurs
      }

      return session;
    })
    .catch(() => { // error handling when throw occurs
      // make a new session
      return models.Sessions.create() // create a session and send it to the next block by returning
        .then(results => {
          return models.Sessions.get({id: results.insertId}); // get session through input id and send session to the next then block
        })
        // this then block can also be outside of the catch block
        .then(session => {
          // this set cookie action can also be inside the last then block
          // it is not because if a valid cookie exists, setting cookie headers is not needed
          res.cookie('shortlyid', session.hash); // set cookie on response
          return session; // return session to models.Sessions.create()
        })
    })
    .then(session => {
      // otherwise
      // set session on request object
      req.session = session;
      next();
    })
    // if a then() block takes in an input and returns that same input, tap() can be used instead of then()
    // tap() does not expect a return value and passes its input to the next then() block
    // Ex: then(session => {return session}) ===> tap(session)
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

