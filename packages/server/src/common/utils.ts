import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrganizationStatusEnum } from '@scspace-depot/enums/organization.enum';

export function timeRangeCheck(timeFrom: number, timeTo: number): boolean {
  return timeFrom < timeTo;
}

export function takeOne<T>(name?: string): (array: T[]) => T {
  return (array: T[]) => {
    // 배열의 요소가 하나만 나왔는 지를 검증하는 함수
    if (array.length === 0)
      throw new NotFoundException(`${name ?? 'array'} is empty`);
    if (array.length > 1)
      throw new BadRequestException(`${name ?? 'array'} is not only one`);
    return array[0];
  };
}

export function takeUnique<
  T extends string | number | boolean | symbol | null | undefined | bigint,
>(array: T[]): T[] {
  // 중복을 제외하고 배열을 반환하는 함수
  // JS 기본 자료형에 대해 잘 작동할듯??
  return [...new Set(array)];
}

export function checkContainAllId<T, K extends number>(
  ids: K[],
  array: T[],
  name?: string,
): asserts array is T[] & { [key in K]: T } {
  // 중복을 제외하고, 넣은 id가 모두 값이 잘 나왔는지를 체크해주는 함수
  const uniqueIds = takeUnique(ids);
  if (ids.some((id) => !uniqueIds.includes(id))) {
    throw new NotFoundException(
      `The length of ${name ?? 'array'} does not match | id length: ${uniqueIds.length} || array length: ${array.length}`,
    );
  }
}

export function takeAll<T extends { id: K }, K extends number>(
  ids: K[],
  name?: string,
): (array: T[]) => T[] {
  // 중복을 제외하고, 넣은 id가 모두 값이 잘 나왔는지를 체크해서 값을 얻는 함수
  return (array: T[]) => {
    checkContainAllId(ids, array, name);
    return array;
  };
}

export function takeExist<T>(name?: string): (array: T[]) => T[] {
  return (array: T[]) => {
    if (array.length === 0)
      throw new NotFoundException(`${name ?? 'array'} is empty`);
    return array;
  };
}

export function getNow() {
  const date = new Date();

  const year = date.getFullYear();
  const month = date.getMonth() + 12 * year;
  const day = date.getDate() + 32 * month;
  const hour = date.getHours() + day * 24;
  return date.getMinutes() + hour * 60;
}

export function getTime(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 12 * year;
  const day = date.getDate() + 32 * month;
  const hour = date.getHours() + day * 24;
  return date.getMinutes() + hour * 60;
}

export function getDateUnit(time: number) {
  const minute = time % 60;
  time = Math.floor(time / 60);
  const hour = time % 24;
  time = Math.floor(time / 24);
  const day = time % 32;
  time = Math.floor(time / 32);
  const month = time % 12;
  const year = Math.floor(time / 12);

  return { year, month, day, hour, minute };
}

export function getDate(time: number): Date {
  const { year, month, day, hour, minute } = getDateUnit(time);
  return new Date(year, month, day, hour, minute);
}

export function getDateString(time: number) {
  const { year, month, day } = getDateUnit(time);
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function getString(time: number) {
  const dateString = getDateString(time);
  const { hour, minute } = getDateUnit(time);
  return `${dateString} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function getDateDiffInMinute(timeBefore: number, timeAfter: number) {
  const dateBefore = getDate(timeBefore);
  const dateAfter = getDate(timeAfter);
  return (dateAfter.getTime() - dateBefore.getTime()) / (1000 * 60);
}

export function getLegacyTimeFromUnits(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  return (((year * 12 + month) * 32 + day) * 24 + hour) * 60 + minute;
}

// Calendar-day arithmetic on the wall-clock value; UTC avoids host timezone and DST shifts
export function addLegacyTimeDays(time: number, days: number): number {
  const { year, month, day, hour, minute } = getDateUnit(time);
  const date = new Date(Date.UTC(year, month, day + days));
  return getLegacyTimeFromUnits(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hour,
    minute,
  );
}

export function getLegacyTimeAtEndOfDay(time: number): number {
  const { year, month, day } = getDateUnit(time);
  return getLegacyTimeFromUnits(year, month, day, 23, 59);
}

export function getOrganizationStatusString(status: OrganizationStatusEnum): {
  kr: string;
  en: string;
} {
  switch (status) {
    case OrganizationStatusEnum.REJECTED:
      return {
        kr: '반려',
        en: 'Rejected',
      };
    case OrganizationStatusEnum.REGISTER_REQUEST:
      return {
        kr: '등록 대기',
        en: 'Registration Pending',
      };
    case OrganizationStatusEnum.REGISTERED:
      return {
        kr: '등록',
        en: 'Registered',
      };
    case OrganizationStatusEnum.VERIFY_REQUEST:
      return {
        kr: '인증 대기',
        en: 'Verification Pending',
      };
    case OrganizationStatusEnum.VERIFIED:
      return {
        kr: '인증',
        en: 'Verified',
      };
  }
}

export function getDateBegin(time: number): number {
  return time - (time % (24 * 60));
}

export function getDateEnd(time: number): number {
  return time - (time % (24 * 60)) + 24 * 60 - 1;
}

export function getWeekPeriod(time: number): { weekStart: number; weekEnd: number } {
  const date = getDate(time);
  const weekStart = getDateBegin(getTime(date) - (date.getDay() * 24 * 60));
  const weekEnd = getDateEnd(getTime(date) + ((6 - date.getDay()) * 24 * 60));
  return { weekStart, weekEnd };
}

export function getRandomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}
