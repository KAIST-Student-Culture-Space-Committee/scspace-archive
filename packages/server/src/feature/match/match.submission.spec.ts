jest.mock('@scspace-depot/enums/organization.enum', () => ({ OrganizationStatusEnum: {} }), { virtual: true });
import { parseContact, parseStartTime, assertSubmissionOpen, isSubmissionOpen } from './match.submission';
import { getTime } from '../../common/utils';

describe('match submission validation', () => {
  it('normalizes spaces and hyphens before saving a phone number', () => {
    expect(parseContact({ phoneNumber: '010 1234-5678', privacyConsent: true })).toEqual({ phoneNumber: '01012345678', privacyConsent: true });
  });
  it.each(['01112345678', '0101234567', '010123456789', '+821012345678', '010abcdefgh', null])('rejects invalid phone %s', (phoneNumber) => {
    expect(() => parseContact({ phoneNumber, privacyConsent: true })).toThrow();
  });
  it.each([false, undefined, 'true', 1])('requires explicit consent %s', (privacyConsent) => {
    expect(() => parseContact({ phoneNumber: '01012345678', privacyConsent })).toThrow();
  });
  it('accepts a legacy kickoff and rejects an impossible calendar date', () => {
    const time = getTime(new Date(2026, 9, 26, 5));
    expect(parseStartTime(time)).toBe(time);
    const february30 = (((2027 * 12 + 1) * 32 + 30) * 24) * 60;
    expect(() => parseStartTime(february30)).toThrow();
  });
  it.each([null, '100', 0, -1, 1.2, Number.MAX_SAFE_INTEGER])('rejects invalid start time %s', (time) => {
    expect(() => parseStartTime(time)).toThrow();
  });
  it('accepts a submission before kickoff and rejects the exact boundary', () => {
    const match = { allowSubmission: true, startTime: 100 };
    expect(() => assertSubmissionOpen(match, 99)).not.toThrow();
    expect(() => assertSubmissionOpen(match, 100)).toThrow();
    expect(() => assertSubmissionOpen(match, 101)).toThrow();
    expect(isSubmissionOpen(match, 100)).toBe(false);
  });
  it('rejects unconfigured or manually closed matches', () => {
    expect(() => assertSubmissionOpen({ allowSubmission: true, startTime: null }, 99)).toThrow();
    expect(() => assertSubmissionOpen({ allowSubmission: false, startTime: 100 }, 99)).toThrow();
  });
});
