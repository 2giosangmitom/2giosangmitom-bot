/**
 * @file Define constants that are used for the entire project
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 */

import { pino } from 'pino';

/** @description Pino object for entire project */
export const log = pino({
  transport: {
    target: 'pino-pretty'
  }
});
