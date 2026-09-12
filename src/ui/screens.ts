
export async function gotoFmsScreen(screen: string, program: string): Promise<boolean> {
    console.log(`FMS screen requested: ${screen} (${program})`)
    return true;
}

export async function gotoFMIGMscreen(): Promise<boolean> {
    console.log('FMIGM screen requested')
    return true;
}

export async function gotoFMPDDDscreen(): Promise<boolean> {
    return gotoFmsScreen('FMPDDD', 'FMPDDD')
}

export async function gotoFMPDDscreen(): Promise<boolean> {
    return gotoFmsScreen('FMPDD', 'FMPDD')
}

export async function gotoFMPMIPDscreen(): Promise<boolean> {
    return gotoFmsScreen('FMPMIPD', 'FMPMIPD')
}

export async function gotoFMMFAscreen(): Promise<boolean> {
    return gotoFmsScreen('FMMFA', 'FMMFA')
}

export async function gotoFMPMFIscreen(): Promise<boolean> {
    return gotoFmsScreen('FMPMFI', 'FMPMFI')
}

export async function gotoFMMFDscreen(): Promise<boolean> {
    return gotoFmsScreen('FMMFD', 'FMMFD')
}

export async function confirm(row: number, column: number, text: string): Promise<boolean> {
    console.log(`FMS confirmation requested at ${row},${column}: ${text}`)
    return true;
}

export async function typeAndEnter(row: number, column: number, text: string): Promise<void> {
    console.log(`FMS input at ${row},${column}: ${text}`)
}

export async function type(row: number, column: number, text: string): Promise<void> {
    console.log(`FMS input at ${row},${column}: ${text}`)
}

export async function typeAndEnterDate(row: number, dayColumn: number, monthColumn: number, yearColumn: number, date: Date): Promise<void> {
    console.log(`FMS date input at ${row},${dayColumn},${monthColumn},${yearColumn}: ${date.toISOString()}`)
}

export async function typeDate(row: number, dayColumn: number, monthColumn: number, yearColumn: number, date: Date): Promise<void> {
    console.log(`FMS date input at ${row},${dayColumn},${monthColumn},${yearColumn}: ${date.toISOString()}`)
}

export async function typeAndEnterTime(row: number, startColumn: number, endColumn: number, date: Date): Promise<void> {
    console.log(`FMS time input at ${row},${startColumn},${endColumn}: ${date.toISOString()}`)
}

export async function typeTime(row: number, startColumn: number, endColumn: number, date: Date): Promise<void> {
    console.log(`FMS time input at ${row},${startColumn},${endColumn}: ${date.toISOString()}`)
}

export type CursorPosition = {
    row: number
    column: number
}

export async function getCursorPosition(): Promise<CursorPosition> {
    console.log('FMS cursor position requested')
    return { row: 0, column: 0 }
}

export async function clearScreenText(row: number, column: number, length: number): Promise<void> {
    console.log(`FMS screen text cleared at ${row},${column} for ${length} characters`)
}

export async function enter(): Promise<void> {
    console.log('FMS enter requested')
}

export async function isProtected(row: number, column: number, length: number): Promise<boolean> {
    console.log(`FMS protection status requested at ${row},${column} for ${length} characters`)
    return true
}

export async function getScreenText(row: number, column: number, length: number): Promise<string> {
    return getScreenTextTrimmed(row, column, length)
}

export async function getInteger(row: number, column: number, length: number): Promise<number> {
    const value = Number.parseInt(await getScreenTextTrimmed(row, column, length), 10)
    return Number.isNaN(value) ? 0 : value
}

export async function getDecimal(row: number, column: number, length: number): Promise<number> {
    const value = Number.parseFloat(await getScreenTextTrimmed(row, column, length))
    return Number.isNaN(value) ? 0 : value
}

export async function isProgramName(...programs: string[]): Promise<boolean> {
    console.log(`FMS program name requested: ${programs.join(', ')}`)
    return false
}

export async function isPleaseConfirm(): Promise<boolean> {
    console.log('FMS please-confirm status requested')
    return false
}

export async function waitForScreen(...screens: string[]): Promise<boolean> {
    console.log(`FMS screen wait requested: ${screens.join(', ')}`)
    return false
}

export async function getScreenTextTrimmed(row: number, column: number, length: number): Promise<string> {
    console.log(`FMS screen text requested at ${row},${column} for ${length} characters`)
    return ''
}

export async function setAction(action: string): Promise<void> {
    console.log(`FMS action requested: ${action}`)
}

export async function pleaseConfirm(response: string): Promise<Date> {
    console.log(`FMS confirmation response: ${response}`)
    return new Date()
}

export function getNextBusinessDay(date: Date): Date {
    const nextBusinessDay = new Date(date)
    nextBusinessDay.setDate(nextBusinessDay.getDate() + 1)

    while (nextBusinessDay.getDay() === 0 || nextBusinessDay.getDay() === 6) {
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1)
    }

    return nextBusinessDay
}

export async function getScreenDate(row: number, dayColumn: number, monthColumn: number, yearColumn: number): Promise<Date> {
    const day = Number.parseInt(await getScreenTextTrimmed(row, dayColumn, 2), 10)
    const month = Number.parseInt(await getScreenTextTrimmed(row, monthColumn, 2), 10)
    const year = Number.parseInt(await getScreenTextTrimmed(row, yearColumn, 4), 10)
    const screenDate = new Date(year, month - 1, day)

    if (
        screenDate.getFullYear() === year
        && screenDate.getMonth() === month - 1
        && screenDate.getDate() === day
    ) {
        return screenDate
    }

    return new Date(1899, 11, 30)
}