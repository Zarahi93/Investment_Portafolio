const express = require('express');
const path = require('path');
const app = express();

const serveHtml = (filePath) => (req, res) => {
    res.sendFile(path.join(__dirname, ...filePath));
};

app.get('/', serveHtml(['html', 'logIn.html']));
app.get('/recover', serveHtml(['html', 'recoverPassword.html']));
app.get('/signup', serveHtml(['html', 'signUp.html']));
app.get('/quiz', serveHtml(['html', 'quiz.html']));
app.get('/dashboard', serveHtml(['html', 'dashboard.html']));

function startServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`Server started on http://localhost:${PORT}`)
  );
}

/* istanbul ignore next */
if (require.main === module) {
  startServer();
}

module.exports = {app, startServer};
