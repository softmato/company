import 'server-only';

export {
  checkTotp,
  createTotpEnrolment,
  enrolmentUri,
  verifyTotp,
} from './totp.core';
export type { TotpCheck, TotpEnrolment } from './totp.core';
