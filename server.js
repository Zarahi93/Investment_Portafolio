const express = require('express');
const path = require('path');
const app = express();

const serveHtml = (filePath) => (req, res) => {
    res.sendFile(path.join(__dirname, ...filePath));
};
// Serve static files
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

app.get('/', serveHtml(['html', 'logIn.html']));
app.get('/recover', serveHtml(['html', 'recovery.html']));
app.get('/signup', serveHtml(['html', 'signUp.html']));
app.get('/quiz', serveHtml(['html', 'quiz.html']));
app.get('/dashboard', serveHtml(['html', 'dashboard.html']));

// New recovery route
app.get('/api/recover/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const response = await fetch(`http://172.18.106.193:3001/db/user/email/${email}`);
    if (!response.ok) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = await response.json();
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

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
