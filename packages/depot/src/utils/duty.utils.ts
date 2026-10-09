import { DUTY_HOURS } from "../consts/duty.const";

// 예약 시간은 (((년*12 + 월(0~11))*32 + 일)*24 + 시)*60 + 분 으로 인코딩된 KST 기준 값
export interface IDutyWindow {
    timeFrom: number;
    timeTo: number;
}

const encode = (year: number, month: number, date: number, minuteOfDay: number): number =>
    ((year * 12 + month) * 32 + date) * 24 * 60 + minuteOfDay;

const decodeDate = (time: number) => {
    const days = Math.floor(time / (24 * 60));
    return {
        year: Math.floor(days / (32 * 12)),
        month: Math.floor(days / 32) % 12,
        date: days % 32,
    };
};

// [rangeFrom, rangeTo)와 겹치는 상근시간 구간 목록 (각 구간은 상근시간 전체)
const getDutyWindows = (rangeFrom: number, rangeTo: number): IDutyWindow[] => {
    if (rangeFrom >= rangeTo) return [];

    const windows: IDutyWindow[] = [];
    const start = decodeDate(rangeFrom);
    const end = decodeDate(rangeTo);
    const cursor = new Date(Date.UTC(start.year, start.month, start.date));
    const last = Date.UTC(end.year, end.month, end.date);

    while (cursor.getTime() <= last) {
        const year = cursor.getUTCFullYear();
        const month = cursor.getUTCMonth();
        const date = cursor.getUTCDate();
        const dayOfWeek = cursor.getUTCDay() || 7;

        for (const period of DUTY_HOURS) {
            if (period.dayOfWeek !== dayOfWeek) continue;
            const timeFrom = encode(year, month, date, period.startMinute);
            const timeTo = encode(year, month, date, period.endMinute);
            if (timeFrom < rangeTo && rangeFrom < timeTo) {
                windows.push({ timeFrom, timeTo });
            }
        }
        cursor.setUTCDate(date + 1);
    }

    return windows;
};

const getDutyOverlaps = (timeFrom: number, timeTo: number): IDutyWindow[] =>
    getDutyWindows(timeFrom, timeTo).map((window) => ({
        timeFrom: Math.max(window.timeFrom, timeFrom),
        timeTo: Math.min(window.timeTo, timeTo),
    }));

const overlapsDutyHours = (timeFrom: number, timeTo: number): boolean =>
    getDutyWindows(timeFrom, timeTo).length > 0;

export const DutyUtils = {
    getDutyWindows,
    getDutyOverlaps,
    overlapsDutyHours,
};
