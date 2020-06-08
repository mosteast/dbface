module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!@ngrx|(?!deck.gl)|ng-dynamic)',
  ],
  setupFiles: [ 'dotenv/config' ],
  testPathIgnorePatterns: [
    '/node_modules/', '/build/', '/dist/',
  ],
}
