module.exports = {
  comments: false,
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: "last 2 chrome version, last 2 firefox version"
        }
      }
    ]
  ],
  plugins: [["@babel/plugin-proposal-class-properties", { loose: true }]]
};
