// server.js

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files (CSS, JS, Images) from the 'assets' and 'css' directories
app.use(express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'main')));
app.use(express.static(path.join(__dirname, 'scripts')));

// Serve the SPA's HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
