# Disc-Tools Developer Portal

Source for the Disc-Tools developer portal at <https://developers.disc-tools.de/>.
The portal provides API documentation, API token management, usage metrics, and request logs.

## Project structure

| Path | Contents |
| --- | --- |
| `index.html` | Public landing page |
| `_private/` | Authenticated portal pages |
| `static/` | Styles, browser JavaScript, and bundled assets |
| `legal/` | Imprint, privacy policy, and terms |
| `_errors/` | Custom Nginx HTML and JSON error responses |

## Development

The frontend uses plain HTML, CSS, and JavaScript and has no build step.
To preview the public pages locally, serve the checkout on loopback:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. The production Nginx configuration
protects the portal routes and forwards API requests to the Disc-Tools backend.
Testing sign-in, token management, and usage data requires that configuration
and a running backend. Keep the local preview bound to loopback because it
serves checkout files directly.

## Production routing

- Nginx serves the public pages and static assets. It blocks direct requests to
  `/_private/`. The public `/portal/` routes use an internal authentication
  subrequest before serving the corresponding HTML. Signed-out visitors are
  redirected to the home page, and denied accounts to `/blocked/no-access`.
- The auth callback, portal auth endpoints, and Link Cleaner endpoint proxy to
  the Disc-Tools backend. Link Cleaner rate limits return HTTP 429.
- Browser errors use `404.html` or the matching internal HTML page under
  `_errors/`. Nginx-generated API errors use `_errors/api.json` and retain
  their HTTP status. Upstream API responses pass through.

After changing the Nginx configuration, run `nginx -t` before reloading.
Verify that signed-out users are redirected from `/portal/`, direct access
to `/_private/portal.html` returns 404, and an unknown `/api/` path returns
404 with JSON. With a Premium test account, follow the portal's Link Cleaner
quickstart to verify token creation and the first API call.

See [LICENSE](LICENSE) for licensing and [SECURITY.md](SECURITY.md) for
reporting a vulnerability.
