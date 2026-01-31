/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-6fc00345'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "vite.svg",
    "revision": "8e3a10e157f75ada21ab742c022d5430"
  }, {
    "url": "registerSW.js",
    "revision": "8976370d061ceb2b28aeb3926b58cb56"
  }, {
    "url": "mask-icon.svg",
    "revision": "c9c558cfc153c724ac015702d2a9edd4"
  }, {
    "url": "manifest-icon-512.maskable.png",
    "revision": "ac507e47710fe733bbe529421d4f6d64"
  }, {
    "url": "manifest-icon-192.maskable.png",
    "revision": "c646ba88c57d0b33a3d4c381ec51710f"
  }, {
    "url": "index.html",
    "revision": "08a21b5a5c4d73653fe7820bb49ad606"
  }, {
    "url": "favicon.svg",
    "revision": "c9c558cfc153c724ac015702d2a9edd4"
  }, {
    "url": "favicon-196.png",
    "revision": "a3930b18919fee8f589f76cba8d8046e"
  }, {
    "url": "apple-icon-180.png",
    "revision": "6c2852f661c4c81412638c527e31d61d"
  }, {
    "url": "assets/index-hmwXVvd-.css",
    "revision": null
  }, {
    "url": "assets/index-DNMsNoud.js",
    "revision": null
  }, {
    "url": "apple-icon-180.png",
    "revision": "6c2852f661c4c81412638c527e31d61d"
  }, {
    "url": "favicon.svg",
    "revision": "c9c558cfc153c724ac015702d2a9edd4"
  }, {
    "url": "manifest-icon-192.maskable.png",
    "revision": "c646ba88c57d0b33a3d4c381ec51710f"
  }, {
    "url": "manifest-icon-512.maskable.png",
    "revision": "ac507e47710fe733bbe529421d4f6d64"
  }, {
    "url": "mask-icon.svg",
    "revision": "c9c558cfc153c724ac015702d2a9edd4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "dbcdcd31b464576a5ba9fd2cb5094c83"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/api\..*/i, new workbox.NetworkFirst({
    "cacheName": "api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
