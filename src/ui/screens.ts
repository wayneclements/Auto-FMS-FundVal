
// Modelled on the legacy `GotoFmsScreen(string screenName, params string[] list)` overload:
// logs into/confirms the FMS session, navigates to the requested screen, then waits for one of
// the expected program names to appear. Returns true once the screen shows an expected program.
export async function gotoFmsScreen(screenName: string, ...programs: string[]): Promise<boolean> {
    await waitForIdle(0)

    if (await confirm(3, 2, 'F9=Production(ACTIVE),F4=Development(ACTIVE)')) {
        await setAction('PF4')
    }

    if (await confirm(1, 2, 'Enter your userid and password')) {
        return true;
        throw new Error('FMS is not logged in, please login and try again');
    }

    if (await confirm(1, 2, 'E#30 Userid is blank or nulls, please enter a userid')) {
        throw new Error('FMS is not logged in, please login and try again')
    }

    if (await confirm(13, 28, "Press 'Enter' to continue")) {
        await enter()
    }

    if (await confirm(20, 9, 'Product Default')) {
        await clearScreenText(20, 29, 4)
    }

    if (await confirm(23, 20, 'Please Confirm') && !(await isProtected(23, 36, 1))) {
        await typeAndEnter(23, 36, 'N')
    }

    await gotoFmsScreenByName(screenName)

    if (await confirm(12, 19, 'Do you want to run the Live version')) {
        await typeAndEnter(12, 62, 'Y')
    }

    for (const programName of programs) {
        if (programName !== '') {
            await waitForScreen(programName)
        }

        if ((await getScreenText(3, 2, programName.length)).trim() === programName) {
            return true
        }
    }

    return false
}

export async function waitForIdle(milliseconds: number): Promise<void> {
    console.log(`FMS wait for idle requested: ${milliseconds}ms`)
}

export async function getFullScreenText(): Promise<string> {
    console.log('FMS full screen text requested')
    return ''
}

// Modelled on the legacy `GotoFmsScreen(string screenName)` overload: navigates from wherever
// the terminal currently is to the command/menu screen, then types the requested screen name
// into the "Next Function" field and waits for it to load, retrying on transient system errors.
export async function gotoFmsScreenByName(screenName: string, environmentCode: string = ''): Promise<string> {
    let screenText = await getFullScreenText()

    while (!screenText.includes('Command') && !screenText.includes('Next Function')) {
        if (await confirm(23, 20, 'Please Confirm') && !(await isProtected(23, 36, 1))) {
            await typeAndEnter(23, 36, 'N')
        }

        await setAction('PF12')

        if (await confirm(2, 2, 'FIS351M1 0044 NAT1701 Non-activity time limit exceeded; press ENTER')) {
            await setAction('ENTER')
        }

        if (await confirm(23, 20, 'Please Confirm')) {
            await typeAndEnter(23, 36, 'N')
        }

        if (await confirm(20, 10, 'Selection')) {
            await typeAndEnter(20, 22, environmentCode)
            break
        }

        if (await confirm(2, 2, 'Press a PF key to select an application')) {
            await setAction('PF4')
        }

        if (await confirm(8, 18, 'Selected product not used on this account')) {
            await setAction('PF3')
        }

        if (await confirm(1, 2, 'FIS349M1 0048 NAT1011 Requested function key not allocated')) {
            await setAction('ENTER')
        }

        if (await confirm(13, 28, "Press 'Enter' to continue")) {
            await setAction('ENTER')
        }

        if (await confirm(13, 15, 'Please Confirm')) {
            await typeAndEnter(13, 32, 'Y')
        }

        if (await confirm(11, 4, 'Please Confirm')) {
            await typeAndEnter(11, 21, 'N')
        }

        await setAction('PF3')

        screenText = await getFullScreenText()
    }

    let attempt = 0
    while (true) {
        attempt += 1

        if (await confirm(11, 4, 'Please Confirm')) {
            await typeAndEnter(11, 21, 'N')
        }

        while (!(await confirm(20, 2, 'Command'))) {
            await setAction('PF12')

            const error = (await getScreenText(1, 2, 79)).trim()
            if (error.includes('function key not allocated')) {
                await setAction('PF3')
            }

            if (await confirm(3, 4, 'This Investment Option is not Nil Entry Fee Product')) {
                await setAction('PF3')
            }

            if (await confirm(1, 24, 'Requested function key not allocated')) {
                await enter()
            }
        }

        await typeAndEnter(20, 12, screenName)
        await waitForIdle(0)

        if (await confirm(10, 26, 'A System Error has been detected')) {
            if (attempt < 3) {
                await setAction('PF12')
                continue
            }
            return getScreenTextTrimmed(3, 2, 8)
        }

        return getScreenTextTrimmed(3, 2, 8)
    }
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
    console.log(`FMS screen text requested at ${row},${column} for ${length} characters`)
    return ''
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
    const text = await getScreenText(row, column, length)
    return text.trim().replace(/_/g, '')
}

export async function setAction(action: string): Promise<void> {
    console.log(`FMS action requested: ${action}`)
}

export async function getScreenTime(row: number, hourColumn: number, minuteColumn: number, secondColumn: number): Promise<Date> {
    const hour = Number.parseInt(await getScreenTextTrimmed(row, hourColumn, 2), 10)
    const minute = Number.parseInt(await getScreenTextTrimmed(row, minuteColumn, 2), 10)
    const second = Number.parseInt(await getScreenTextTrimmed(row, secondColumn, 2), 10)

    const screenTime = new Date()
    screenTime.setHours(hour, minute, second, 0)

    return screenTime
}

export async function pleaseConfirm(response: string): Promise<Date> {
    let result = await getScreenTime(4, 70, 73, 76)

    await getScreenTextTrimmed(12, 31, 'Processing'.length)

    if (await confirm(23, 20, 'Please Confirm')) {
        try {
            await typeAndEnter(23, 36, response)
            result = await getScreenTime(4, 70, 73, 76)
            return result
        } catch {
            result = await getScreenTime(4, 70, 73, 76)
        }
    }

    return result
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