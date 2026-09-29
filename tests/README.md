# Frontend Regression Checks

Compile the mini program TypeScript before testing the generated JavaScript:

```sh
npm ci
npm run build:miniprogram
npm test
```

The tests mock the WeChat page lifecycle and HTTP client. They do not start or
modify the backend. They cover failed requests, order cancellation IDs, payment
deadlines, duplicate submissions, check-in states and page event bindings.

The mini program checks also cover the new calendar's month/year boundaries,
partial availability failures, selection invalidation after refresh, late
responses, cancellation of filter animations and the full date → slot → court →
contact → booking request chain. Service calls are mocked, so this validates
frontend behavior without creating backend orders.

For an independent scan of the rendered QR pixels, install jsQR outside the repo
and point `QR_DECODER` to its CommonJS module:

```sh
npm install --prefix /tmp/wechatapp-frontend-check --no-audit --no-fund jsqr@1.4.0
QR_DECODER=/tmp/wechatapp-frontend-check/node_modules/jsqr/dist/jsQR.js node --test tests/frontend.test.cjs
```

Without `QR_DECODER`, only the QR decoding test is skipped. Actual WeChat canvas
rendering, device permissions and layout still require Developer Tools or a phone.

## Browser Preview

```sh
npm run test:web
```

Playwright starts Vite or reuses the server on port 5173. Tests cover search,
filters, navigation during animations, a future-date booking, the selected order's
check-in preview, logout, both HTML entry points and the separate motion demo.
They run at desktop, mobile and 320px widths, report uncaught page errors and save
screenshots to `test-results/`. These tests use demo data and do not start the backend.
On macOS they use Google Chrome; elsewhere install Chromium with
`npx playwright install chromium` first.
