const fs = require('fs');
const path = require('path');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colores
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Backgrounds
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Niveles de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${this.getDateString()}.log`);
  }

  getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = null) {
    const timestamp = this.getTimestamp();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (meta) {
      formattedMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return formattedMessage;
  }

  writeToFile(message) {
    try {
      // Verificar si cambió el día (crear nuevo archivo)
      const expectedFile = path.join(logsDir, `app-${this.getDateString()}.log`);
      if (expectedFile !== this.logFile) {
        this.logFile = expectedFile;
      }

      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      console.error('Error escribiendo en archivo de log:', error.message);
    }
  }

  log(level, message, meta = null, color = colors.white) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Escribir siempre a archivo
    this.writeToFile(formattedMessage);
    
    // Escribir a consola solo si el nivel lo permite
    const levelValue = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    if (levelValue <= currentLevel) {
      console.log(`${color}${formattedMessage}${colors.reset}`);
    }
  }

  error(message, meta = null) {
    this.log('ERROR', message, meta, colors.red);
  }

  warn(message, meta = null) {
    this.log('WARN', message, meta, colors.yellow);
  }

  info(message, meta = null) {
    this.log('INFO', message, meta, colors.cyan);
  }

  debug(message, meta = null) {
    this.log('DEBUG', message, meta, colors.magenta);
  }

  success(message, meta = null) {
    this.log('INFO', ` ${message}`, meta, colors.green);
  }

  // Log especial para requests HTTP
  http(method, url, statusCode, duration) {
    const color = statusCode >= 500 ? colors.red :
                  statusCode >= 400 ? colors.yellow :
                  statusCode >= 300 ? colors.cyan :
                  colors.green;

    const message = `${method} ${url} ${statusCode} - ${duration}ms`;
    this.log('INFO', message, null, color);
  }
}

module.exports = new Logger();