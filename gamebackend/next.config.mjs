/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

module.exports = {
    experimental: { socket: true },
    webpack: config => {
      const original = config.entry;
      config.entry = async() => {
        const entries = await original();
        entries['main.js'] && entries['main.js'].unshift('./socket.js');
        return entries;
      };
      return config;
    }
  };