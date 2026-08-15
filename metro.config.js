// Metro config — tambah ekstensi .bin sebagai asset supaya model face
// (faceres.bin) bisa di-require dan di-bundle ke app.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('bin')) {
  config.resolver.assetExts.push('bin');
}

// tfjs-react-native me-require 'react-native-fs' (hanya dipakai release mode).
// Stub supaya Metro bisa resolve; di Expo Go path itu tidak pernah dipanggil.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-fs') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'stubs', 'react-native-fs.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
