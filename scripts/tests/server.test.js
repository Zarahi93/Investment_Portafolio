// server.test.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../../server.js');
const { clear } = require('console');

let server;
let port;

beforeAll(done => {
    server = app.listen(0, () => {
        port = server.address().port;
        console.log(`Test server running on port ${port}`);
        done();
    });
});

afterAll(done => {
    server.close(done);
});

function fetch(pathname) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: pathname,
            method: 'GET'
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: data });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

function getExpectedHtml(filePath) {
    return fs.readFileSync(path.join(__dirname, '..','..', ...filePath), 'utf-8');
}

describe('Express routes', () => {
    test('GET / should return index.html', async () => {
        const res = await fetch('/');
        expect(res.statusCode).toBe(200);
        const expected = getExpectedHtml(['index.html']);
        expect(res.body).toBe(expected);
    });

    test('GET /login should return logIn.html', async () => {
        const res = await fetch('/login');
        expect(res.statusCode).toBe(200);
        const expected = getExpectedHtml(['html', 'logIn.html']);
        expect(res.body).toBe(expected);
    });

    test('GET /signup should return signUp.html', async () => {
        const res = await fetch('/signup');
        expect(res.statusCode).toBe(200);
        const expected = getExpectedHtml(['html', 'signUp.html']);
        expect(res.body).toBe(expected);
    });

    test('GET /quiz should return signUp.html', async () => {
        const res = await fetch('/quiz');
        expect(res.statusCode).toBe(200);
        const expected = getExpectedHtml(['html', 'quiz.html']);
        expect(res.body).toBe(expected);
    });

     test('GET /dashboard should return signUp.html', async () => {
        const res = await fetch('/dashboard');
        expect(res.statusCode).toBe(200);
        const expected = getExpectedHtml(['html', 'dashboard.html']);
        expect(res.body).toBe(expected);
    });

    test('GET /nonexistent should return 404', async () => {
        const res = await fetch('/nonexistent');
        expect(res.statusCode).toBe(404);
    });
});
