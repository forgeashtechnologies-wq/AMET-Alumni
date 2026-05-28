import logger from './logger';

export const log = {
  ok: (...a) => logger.info('[OK]', ...a),
  info: (...a) => logger.info('[INFO]', ...a),
  warn: (...a) => logger.warn('[WARN]', ...a),
  err: (...a) => logger.error('[ERR]', ...a),
  group(label) {
    logger.info(String(label));
  }
};
