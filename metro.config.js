const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const serverDir = path.resolve(__dirname, 'server');

// Only exclude the project-level server/ directory (not node_modules paths containing "server")
config.resolver.blockList = [
  new RegExp('^' + serverDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\/.*$'),
];

module.exports = config;
