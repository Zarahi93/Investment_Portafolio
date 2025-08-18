// server.js
const express = require('express');
const path = require('path');
const app = express();

const serveHtml = (filePath) => (req, res) => {
    res.sendFile(path.join(__dirname, ...filePath));
};

app.get('/', serveHtml(['index.html']));
app.get('/login', serveHtml(['html', 'logIn.html']));
app.get('/signup', serveHtml(['html', 'signUp.html']));
app.get('/quiz', serveHtml(['html', 'quiz.html']));
app.get('/dashboard', serveHtml(['html', 'dashboard.html']));

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
}

module.exports = app;
