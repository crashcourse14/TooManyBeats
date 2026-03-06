const Logger = {
  format(level, message) {
    const date = new Date().toISOString();
    return `[${date}] - [${level}]: ${message}`;
  },

  info(message) {
    console.log(this.format("Info", message));
  },

  warn(message) {
    console.warn(this.format("Warn", message));
  },

  error(message) {
    console.error(this.format("Error", message));
  }
};