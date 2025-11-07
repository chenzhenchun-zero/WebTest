# WebTest

This project contains a Google-style search landing page implemented with static HTML, CSS, and JavaScript.

## Previewing the page

Because everything is static, you can open `index.html` directly in a browser or serve it with any simple HTTP server:

### Option 1: Open the file directly
1. Locate the project folder on your machine.
2. Double-click `index.html` (or open it from your browser using **File → Open**).

### Option 2: Run a local static server
From the project root, run one of the following commands:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js (requires the `serve` package installed globally)
serve .
```

After the server starts, visit `http://localhost:8080` (or the port shown in the terminal) in your browser to view the page.

## Project structure

- `index.html` – page markup and search form
- `styles.css` – visual styling for the layout and interactive states
- `script.js` – client-side behavior for search, lucky button, and input clearing

## Browser support

The layout uses modern CSS features that are supported in the latest versions of Chrome, Firefox, Edge, and Safari.
