export const DUTY_HOURS = [
    { dayOfWeek: 1, startMinute: 19 * 60, endMinute: 21 * 60 },
    { dayOfWeek: 2, startMinute: 19 * 60, endMinute: 21 * 60 },
    { dayOfWeek: 3, startMinute: 19 * 60, endMinute: 21 * 60 },
    { dayOfWeek: 4, startMinute: 21 * 60, endMinute: 23 * 60 },
] as const;

export const DUTY_HOURS_KO = '월~수요일 19:00~21:00, 목요일 21:00~23:00';
