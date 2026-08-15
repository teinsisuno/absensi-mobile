// Stub react-native-fs — tfjs-react-native hanya memakai module ini di
// release mode (loadLocalAsset). Di Expo Go / dev selalu lewat loadViaHttp,
// jadi stub kosong aman dan membuat Metro tidak gagal resolve.
module.exports = { default: {}, readFile: () => Promise.reject(new Error('not available')), readFileRes: () => Promise.reject(new Error('not available')) };
