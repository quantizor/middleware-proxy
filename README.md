# middleware-proxy

This is a simple tool that smooths the difficulties of working on integrated projects where the backend is hosted elsewhere from where you are developing your frontend. The proxy allows you to access your static HTML through a node server and redirect your RESTful calls to the implementing server.

## usage

```js
const proxy = require('middleware-proxy');

/**
 * Returns a middleware function that selectively proxies incoming requests to another server.
 *
 * @param  {string|RegExp} matcher - used to detect if the middleware should be applied against the request URL
 * @param  {string} server - a fully qualified server address, e.g. http://localhost:8080
 * @param  {string} [path_to_strip] - (optional) a leading string that should be removed from the request URI
 *
 * @return {function} middleware, suitable for use in express or connect
 */
proxy('/api/v1', 'http://localhost:8080')`
```

### basic express example

```js
const express = require('express');
const app = express();
const http = require('http');
const proxy = require('middleware-proxy');

app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.use(express.static(__dirname + '/app'));
});

app.use(proxy('/service', 'http://localhost:8080'));

http.createServer(app).listen(app.get('port'), function() {
    console.log(`Express server listening on port ${app.get('port')}`);
});
```

This will send all requests starting with `/service` to `http://localhost:8080/service`.

### using [budo](https://www.npmjs.com/package/budo) (a browserify livereload solution)

```js
const proxy = require('middleware-proxy');

require('budo')('index.js', {
    browserify: {
        debug: true,
    },

    host: '0.0.0.0',
    live: true,
    open: true,
    portfind: true,
    pushstate: true,
    serve: 'assets/bundle.js',
    stream: process.stdout,

    middleware: [proxy('/service', 'http://localhost:8080')],
});

```

## removing an API prefix

Let's say your integration environment has chosen `/api` as the mount point for communicating with your application's backend APIs. However, you're building your frontend in a separate project and can't easily run a dev server that joins both functionalities. `middleware-proxy` solves this issue by allowing a third optional parameter that defines the part of the request URL to be stripped away when proxying the request to your destination host.

Assuming your remote development API host is at `http://localhost:8080` and has a RESTful collection called `/posts`, you would write your AJAX calls to `GET` from `/api/posts` and use the following configuration:

```js
proxy('/api/posts', 'http://localhost:8080', '/api');
```

The request is transparently redirected behind the scenes:

```
GET /api/posts -> GET http://localhost:8080/posts
```

<sub>Based on the work in [rgaskill/dev-rest-proxy](https://github.com/rgaskill/dev-rest-proxy)</sub>
