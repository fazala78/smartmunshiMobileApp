module.exports = {
  // Removing dependencies: { 'react-native-vector-icons': { platforms: { ios: null } } }
  // is necessary to allow the CLI to handle the linking again.
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
