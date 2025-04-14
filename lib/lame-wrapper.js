const Lame = require('lamejs');

// Create a singleton instance of Lame
const lameInstance = new Lame();

// Export the instance and any other needed exports from lamejs
module.exports = {
  lame: lameInstance,
  Mp3Encoder: Lame.Mp3Encoder,
  MPEGMode: Lame.MPEGMode
}; 