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

See [LICENSE](LICENSE) for licensing and [SECURITY.md](SECURITY.md) for
reporting a vulnerability.
