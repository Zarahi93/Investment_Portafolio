module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'json']
};