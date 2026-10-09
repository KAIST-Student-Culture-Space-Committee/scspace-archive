// Legacy time of the current wall clock (browser local time, same as the rest of this app)
export function getBusinessNow(): number {
    return dateUtils().getTime(new Date());
}

export function dateUtils() {
    function getTime(date: Date | { year?: number | 0, month?: number, day?: number, hour?: number, minute?: number }): number {
        if (date instanceof Date) {
            const year = date.getFullYear();
            const month = date.getMonth() + 12 * year;
            const day = date.getDate() + 32 * month;
            const hour = date.getHours() + day * 24;
            const minute = date.getMinutes() + hour * 60;

            return minute;
        }

        const year = date.year ?? 0;
        const month = date.minute ?? 0;
        const day = date.day ?? 0;
        const hour = date.hour ?? 0;
        const minute = date.minute ?? 0;

        return (((year * 12 + month) * 32 + day) * 24 + hour) * 60 + minute;
    }

    function getMidnightTime(time: number) {
        return Math.floor(time / timeUnit.date) * timeUnit.date;
    }

    function getDateUnit(time: number) {
        const minute = time % 60;
        time = Math.floor(time / 60);
        const hour = time % 24;
        time = Math.floor(time / 24);
        const date = time % 32;
        time = Math.floor(time / 32);
        const month = time % 12;
        const year = Math.floor(time / 12);

        return { year, month, date, hour, minute };
    }

    function getDateString(time: number) {
        const { year, month, date } = getDateUnit(time);
        return `${year}-${(month + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
    }

    function getString(time: number) {
        const dateString = getDateString(time);
        const { hour, minute } = getDateUnit(time);
        return `${dateString} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    function getDate(time: number) {
        const { year, month, date, hour, minute } = getDateUnit(time);
        return new Date(year, month, date, hour, minute, 0, 0);
    }

    // Calendar-day arithmetic on the legacy value; UTC avoids timezone and DST shifts
    function addDays(time: number, days: number) {
        const { year, month, date, hour, minute } = getDateUnit(time);
        const next = new Date(Date.UTC(year, month, date + days));
        return (((next.getUTCFullYear() * 12 + next.getUTCMonth()) * 32 + next.getUTCDate()) * 24 + hour) * 60 + minute;
    }

    const minute = 1;
    const hour = minute * 60;
    const date = hour * 24;
    const month = date * 32;
    const year = month * 12;

    const timeUnit = {
        minute,
        hour,
        date,
        month,
        year
    }

    return {
        getTime,
        getNow: getBusinessNow,
        getMidnightTime,
        addDays,
        getDateUnit,
        getDateString,
        getDate,
        getString,
        timeUnit,
    };
}

export function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }

    const hue = Math.abs(hash) % 360;
    const saturation = 30 + (Math.abs(hash) % 20);
    const lightness = 70 + (Math.abs(hash) % 10);

    const s = saturation / 100;
    const l = lightness / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}