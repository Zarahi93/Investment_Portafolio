const express = require('express');
const path = require('path');

const app = express();

// Route to serve index.html from same directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// Routes /logIn - logIn.html (inside /html)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'logIn.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signUp.html'));
});

app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'quiz.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'dashboard.html'));
});


// Port Number
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
