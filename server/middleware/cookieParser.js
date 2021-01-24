const parseCookies = (req, res, next) => {

  let cookieString = req.get('Cookie'); // get cookies from request headers

  parsedCookies = cookieString.split('; ').reduce((cookies, cookie) => { // convert cookies into an object
    if (cookie) {
      let parts = cookie.split('=');
      cookies[parts[0]] = parts[1];
    }

    return cookies;
  }, {});

  req.cookies = parsedCookies;

  next();
};

module.exports = parseCookies;