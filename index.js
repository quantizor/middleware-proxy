const request = require('request');
const url = require('url');

/**
 * Returns a middleware function that selectively proxies incoming requests to another server.
 *
 * @param  {string|RegExp} matcher - used to detect if the middleware should be applied against the request URL
 * @param  {string} server - a fully qualified server address, e.g. http://localhost:8080
 * @param  {string} [path_to_strip] - (optional) a leading string that should be removed from the request URI
 *
 * @return {function} middleware, suitable for use in express or connect
 */
module.exports = function(matcher, server, path_to_strip) {
  if (typeof matcher !== 'string' && !(matcher instanceof RegExp)) {
    throw new Error('matcher (first arg) must be a string or regex');
  } else if (typeof server !== 'string') {
    throw new Error('server (second arg) must be a string');
  } else if (path_to_strip && typeof path_to_strip !== 'string') {
    throw new Error('path_to_strip (optional third arg) must be a string');
  }

  let { hostname, port, protocol, search, hash } = url.parse(server);

  hostname = hostname || 'localhost';
  port = port ? parseInt(port, 10) : null;
  protocol = protocol || 'http://';
  search = search || '';
  hash = hash || '';

  /**
   * generated middleware
   *
   * @param {object} internal_request - a Node ClientRequest object (https://nodejs.org/api/http.html#http_class_http_clientrequest)
   * @param {object} internal_response - a Node ServerResponse object
   *                                    (https://nodejs.org/api/http.html#http_class_http_serverresponse)
   * @param {function} next - function to skip to the next middleware
   *
   * @return {void}
   */
  return function(internal_request, internal_response, next) {
    if (typeof matcher === 'string' && internal_request.url.indexOf(matcher) !== 0) {
      return next();
    } else if (matcher instanceof RegExp && !internal_request.url.match(matcher)) {
      return next();
    }

    const portPartial = port ? `:${port}` : '';

    const options = {
      headers: {
        host: `${hostname}${portPartial}`,
      },
      method: internal_request.method,
    };

    // non-destructively copy over the original headers

    for (let key in internal_request.headers) {
      if (internal_request.headers.hasOwnProperty(key)) {
        options.headers[key] = options.headers[key] || internal_request.headers[key];
      }
    }

    let path = internal_request.url;

    // if given, remove a prefix from the proxied request URL

    if (path_to_strip && path.substring(0, path_to_strip.length) === path_to_strip) {
      path = path.substring(path_to_strip.length);
    }

    options.jar = true; // enables passing of cookies
    options.uri = `${protocol}//${hostname}${portPartial}${path}${search}${hash}`;

    options.followAllRedirects = true;
    options.followOriginalHttpMethod = true;

    const external_request = request(options);

    external_request.on('error', error => console.error(error));

    external_request.on('response', external_response => {
      const headers = external_response.headers;

      // incoming cookies will likely have the domain of the remote server, so the domain portion
      // must be stripped so they will work as expected

      if (headers['set-cookie']) {
        headers['set-cookie'] = headers['set-cookie'].map(cookie => cookie.replace(/; ?domain=[^;]*/gi, ''));
      }

      // pipe the response from the proxied request into the original response object the client will receive

      internal_response.writeHead(external_response.statusCode, headers);

      external_response.on('data', chunk => internal_response.write(chunk));
      external_response.on('end', () => internal_response.end());
    });

    // pipe the data from the incoming request to the outgoing proxied request
    internal_request.pipe(external_request);
  };
};
