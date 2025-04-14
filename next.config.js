module.exports = {
    transpilePackages: ['lamejs'],
    webpack: (config, { isServer }) => {
      // Add resolve fallbacks for node modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
      };
      
      return config;
    },
  }