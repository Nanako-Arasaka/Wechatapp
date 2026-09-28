# Frontend Regression Checks

Compile the mini program TypeScript before testing the generated JavaScript:

```sh
npm exec --yes --package=typescript@5.3.3 -- tsc -p miniprogram/tsconfig.json
node --test tests/frontend.test.cjs
```

The tests mock the WeChat page lifecycle and HTTP client. They do not start or
modify the backend. They cover failed requests, order cancellation IDs, payment
deadlines, duplicate submissions, check-in states and page event bindings.

For an independent scan of the rendered QR pixels, install jsQR outside the repo
and point `QR_DECODER` to its CommonJS module:

```sh
npm install --prefix /tmp/wechatapp-frontend-check --no-audit --no-fund jsqr@1.4.0
QR_DECODER=/tmp/wechatapp-frontend-check/node_modules/jsqr/dist/jsQR.js node --test tests/frontend.test.cjs
```

Without `QR_DECODER`, only the QR decoding test is skipped. Actual WeChat canvas
rendering, device permissions and layout still require Developer Tools or a phone.
