import { createLogger, format, transports } from 'winston';

import { formatLog } from '@/utils/logging.js';

export const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({
          stack: true,
        }),
        format.colorize({
          colors: {
            debug: 'gray',
            error: 'red',
            http: 'blue',
            info: 'green',
            silly: 'magenta',
            verbose: 'cyan',
            warn: 'yellow',
          },
        }),
        formatLog,
      ),
      handleExceptions: true,
      level: 'info',
    }),
    new transports.File({
      filename: 'logs/bot.log',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({
          stack: true,
        }),
        formatLog,
      ),
      handleExceptions: true,
      level: 'debug',
      options: {
        flags: 'w',
      },
    }),
  ],
});
