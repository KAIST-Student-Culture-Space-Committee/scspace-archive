import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getDate, getDateUnit, getTime } from '../../common/utils';

export function parseStartTime(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new BadRequestException('Start time must be a valid legacy time.');
  }
  const { year } = getDateUnit(value);
  if (year < 1 || year > 9999 || getTime(getDate(value)) !== value) {
    throw new BadRequestException('Start time must be a valid calendar date.');
  }
  return value;
}

export function parseContact(body: { phoneNumber?: unknown; privacyConsent?: unknown }) {
  if (body.privacyConsent !== true) {
    throw new BadRequestException('Consent to personal data collection is required.');
  }
  const phoneNumber = typeof body.phoneNumber === 'string'
    ? body.phoneNumber.replace(/[\s-]/g, '') : '';
  if (!/^010\d{8}$/.test(phoneNumber)) {
    throw new BadRequestException('Phone number must contain 11 digits starting with 010.');
  }
  return { phoneNumber, privacyConsent: true as const };
}

export function assertSubmissionOpen(match: { allowSubmission: boolean; startTime: number | null }, now: number): void {
  if (match.startTime == null) {
    throw new ForbiddenException('Kickoff time must be configured before submissions.');
  }
  if (now >= match.startTime) {
    throw new ForbiddenException('Prediction submissions are closed at kickoff.');
  }
  if (!match.allowSubmission) {
    throw new ForbiddenException('Prediction submissions are not open.');
  }
}

export function isSubmissionOpen(match: { allowSubmission: boolean; startTime: number | null }, now: number): boolean {
  return match.allowSubmission && match.startTime != null && now < match.startTime;
}
