import { writeToProcessingLog as writeProcessingLogEntry } from './database'
import * as screens from './screens.ts'

export async function writeToProcessingLog(environment: string, companyName: string, fundValDate: Date, text: string, ...list: string[]): Promise<void> {
	const message = list.length > 0
		? text.replace(/\{(\d+)\}/g, (placeholder, index: string) => list[Number(index)] ?? placeholder)
		: text

	await writeProcessingLogEntry(environment, companyName, fundValDate, message)
}

export async function processFMSD(fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMSD', 'FIS953M1')) return false

	if (await screens.confirm(23, 20, 'Please Confirm')) {
		await screens.typeAndEnter(23, 36, 'N')
	}

	const nextBusinessDay = screens.getNextBusinessDay(fundValDate)
	let nextDate = await screens.getScreenDate(6, 40, 43, 46)

	if (nextDate.getTime() === nextBusinessDay.getTime()) {
		await screens.setAction('PF12')
		return true
	}

	const fmsDate = `${nextBusinessDay.getFullYear().toString().padStart(4, '0')}${(nextBusinessDay.getMonth() + 1).toString().padStart(2, '0')}${nextBusinessDay.getDate().toString().padStart(2, '0')}`
	await screens.typeAndEnter(7, 20, fmsDate)
	await screens.pleaseConfirm('Y')

	nextDate = await screens.getScreenDate(6, 40, 43, 46)
	return nextDate.getTime() === nextBusinessDay.getTime()
}

function isRunningJobCompleted(_jobName: string, _investmentGroup: string, _submittedAt: Date): boolean {
	return false
}

export async function processFMPPFR(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPPFR', 'FIA445M1')) return false

	await screens.typeAndEnter(18, 2, 'Excel Report Dest')
	await screens.typeAndEnter(7, 22, investmentGroup.padStart(4, ' '))
	const submittedAt = await screens.pleaseConfirm('Y')

	if (!await screens.confirm(2, 31, 'FMPPFR has been submitted for processing')) return false

	const jobName = await screens.getScreenTextTrimmed(2, 8, 8)
	return isRunningJobCompleted(jobName, investmentGroup, submittedAt)
}

export async function processFMPPPD(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPPPD', 'FIA485M1')) return false

	await screens.typeAndEnter(10, 2, 'Report Printed at')
	await screens.typeAndEnter(7, 22, investmentGroup.padEnd(4, ' '))

	if (await screens.confirm(1, 2, 'No Income Payment to be direct credit')) return true

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMPPPD has been submitted for processing')) return false

	const jobName = await screens.getScreenTextTrimmed(2, 8, 8)
	return isRunningJobCompleted(jobName, investmentGroup, submittedAt)
}

export async function processFMITIH(fundValDate: Date): Promise<boolean> {
	if (isJobAlreadySuccessful('FMITIH')) return true
	if (!await screens.gotoFmsScreen('FMITIH', 'FIS757M1')) return false

	await screens.typeAndEnter(21, 7, 'Report Destination')
	if (await screens.confirm(16, 6, 'Fund Valuation Date')) {
		await screens.typeAndEnterDate(16, 29, 34, 39, fundValDate)
	}

	if (await screens.confirm(1, 2, 'Please enter a Fund Valuation Date')) {
		const cursor = await screens.getCursorPosition()
		await screens.typeAndEnterDate(cursor.row, cursor.column, cursor.column + 5, cursor.column + 10, fundValDate)
	}

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMITIH has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMDIH(_fundValDate: Date): Promise<boolean> {
	if (isJobAlreadySuccessful('FMDIH')) return true
	if (!await screens.gotoFmsScreen('FMDIH', 'FIS749M1')) return false

	await screens.typeAndEnter(19, 2, 'Report Destination')
	await screens.enter()
	if (await screens.confirm(1, 2, 'No collated DES files exist for the effective dates entered')) return true
	if (!await screens.waitForScreen('FIS749M2')) return false

	await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMDIH has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMATI(): Promise<boolean> {
	if (isJobAlreadySuccessful('FMATI')) return true
	if (!await screens.gotoFmsScreen('FMATI', 'FIS753M1')) return false

	await screens.typeAndEnter(19, 2, 'Report Destination')
	await screens.typeAndEnterTime(7, 55, 60, new Date(1899, 11, 30))
	if (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMATI has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMHAI(): Promise<boolean> {
	const timeout = Date.now() + 60_000
	if (isJobAlreadySuccessful('FMHAI')) return true
	if (!await screens.gotoFmsScreen('FMHAI', 'FIS753M2')) return false

	await screens.typeAndEnter(19, 2, 'Report Destination')
	await screens.typeAndEnterTime(8, 51, 56, new Date(1899, 11, 30))

	while (!await screens.isPleaseConfirm() && Date.now() < timeout) await screens.enter()
	if (!await screens.isPleaseConfirm()) return false

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 32, 'FMHAI has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

async function getCompanyParameterMaintenanceRow(value: string): Promise<number> {
	for (let row = 10; row <= 21; row += 1) {
		if (await screens.confirm(row, 11, value)) return row
	}

	return 0
}

export async function processFMCP(fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMCP', 'FIS992M1')) return false
	if (!await screens.confirm(5, 2, 'Code Ty')) return false

	await screens.typeAndEnter(5, 11, '70'.padStart(3, ' '))
	await screens.waitForScreen('FIS993M1')

	const row = await getCompanyParameterMaintenanceRow('0003')
	if (row <= 0) return false

	await screens.type(row, 2, 'U')
	const formattedFundValDate = `${fundValDate.getFullYear().toString().padStart(4, '0')}${(fundValDate.getMonth() + 1).toString().padStart(2, '0')}${fundValDate.getDate().toString().padStart(2, '0')}`
	await screens.typeAndEnter(12, 60, formattedFundValDate.padStart(10, ' '))
	await screens.pleaseConfirm('Y')
	return screens.confirm(row, 72, 'Upd')
}

export async function processFMPCP(_fundValDate: Date): Promise<boolean> {
	return screens.gotoFmsScreen('FMPCP', 'FMS490M1')
}

function reportDestination(): string {
	return 'Excel'
}

function parseScreenDate(value: string): Date {
	const parts = value.trim().split(/\D+/).filter(Boolean).map((part) => Number.parseInt(part, 10))
	if (parts.length === 3) {
		const [first, second, third] = parts
		const year = first >= 1000 ? first : third
		const month = first >= 1000 ? second : second
		const day = first >= 1000 ? third : first
		return new Date(year, month - 1, day)
	}

	const digits = value.replace(/\D/g, '')
	if (digits.length === 8) {
		const year = Number.parseInt(digits.slice(0, 4), 10)
		const month = Number.parseInt(digits.slice(4, 6), 10)
		const day = Number.parseInt(digits.slice(6, 8), 10)
		return new Date(year, month - 1, day)
	}

	return new Date(1899, 11, 30)
}

async function typeReportDestination(row: number, firstColumn: number, secondColumn: number, label: string): Promise<void> {
	if (await screens.confirm(row, firstColumn, label)) {
		const destination = reportDestination()
		if (!await screens.confirm(row, secondColumn, destination)) await screens.type(row, secondColumn, destination)
	}
}

export async function processFMTUE(fundValDate: Date): Promise<boolean> {
	if (isJobAlreadySuccessful('FMTUE')) return true

	while (true) {
		if (!await screens.gotoFmsScreen('FMTUE', 'FIS751M1')) return false

		const currentDate = await screens.getScreenDate(14, 30, 35, 40)
		if (currentDate.getTime() >= fundValDate.getTime()) return true

		const nextDate = new Date(currentDate)
		nextDate.setDate(nextDate.getDate() + 1)
		await screens.typeDate(14, 30, 35, 40, nextDate)
		await typeReportDestination(20, 4, 24, 'Report Dest')
		await screens.enter()

		const submittedAt = await screens.pleaseConfirm('Y')
		if (!await screens.confirm(2, 31, 'FMTUE has been submitted for processing')) return false
		if (!isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)) return false
	}
}

async function findFMIGERow(investmentGroup: string, fundValDate: Date): Promise<number> {
	if (!fundValDate) return 0

	while (true) {
		for (let row = 9; row <= 20; row += 1) {
			if (await screens.getInteger(row, 4, 4) === Number.parseInt(investmentGroup, 10)) return row
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 1)).trim() === '') return 0
		await screens.setAction('PF8')
	}
}

async function getListOfOpenInvestmentOptions(investmentGroup: string, fundValDate: Date): Promise<string[]> {
	if (!await screens.gotoFMIGMscreen()) throw new Error('Failed to navigate to FMIGM screen')

	const row = await findFMIGERow(investmentGroup, fundValDate)
	if (row <= 0) return []

	await screens.typeAndEnter(row, 2, 'L')
	if (!await screens.waitForScreen('FIS025M1')) throw new Error('Failed to select investment options')

	const openInvestmentOptions: string[] = []
	while (true) {
		for (let optionRow = 9; optionRow <= 20; optionRow += 1) {
			const option = await screens.getScreenTextTrimmed(optionRow, 4, 4)
			if (Number.parseInt(option, 10) !== 0) {
				const effectiveDate = await screens.getScreenDate(optionRow, 50, 53, 56)
				if (effectiveDate.getTime() === new Date(1899, 11, 30).getTime()) openInvestmentOptions.push(option)
			}
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 1)).trim() === '') return openInvestmentOptions
		await screens.setAction('PF8')
	}
}

async function addNewDistributionRates(_row: number, _fundValDate: Date): Promise<boolean> {
	return false
}

export async function processFMDRM(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	const openInvestmentOptions = await getListOfOpenInvestmentOptions(investmentGroup, fundValDate)
	if (!await screens.gotoFmsScreen('FMDRM', 'FIS105M1')) return false

	await screens.type(5, 15, investmentGroup.padStart(4, ' '))
	const fromDate = await screens.getScreenDate(6, 36, 41, 46)
	fromDate.setFullYear(fromDate.getFullYear() - 3)
	await screens.typeDate(6, 15, 20, 25, fromDate)
	await screens.enter()
	if (!await screens.waitForScreen('FIG105M1')) return false

	while (true) {
		for (let row = 10; row <= 22; row += 1) {
			const investmentOption = await screens.getScreenTextTrimmed(row, 4, 4)
			if (!investmentOption || !openInvestmentOptions.includes(Number.parseInt(investmentOption, 10).toString())) continue
			if (!await screens.getScreenTextTrimmed(row, 57, 9)) continue

			await screens.typeAndEnter(row, 2, 'S')
			const detailScreen = await screens.waitForScreen('FIB106M1')
			const alternateDetailScreen = detailScreen || await screens.waitForScreen('FIG106M2')
			if (alternateDetailScreen) {
				const date = await screens.getScreenDate(10, 4, 7, 10)
				const verifiedColumn = detailScreen ? 36 : 38
				if (date.getTime() !== new Date(1899, 11, 30).getTime() && (date.getTime() !== fundValDate.getTime() || !await screens.confirm(10, verifiedColumn, 'Verified'))) {
					if (!await addNewDistributionRates(row, fundValDate)) return false
				}
				await screens.setAction('PF12')
				continue
			}

			if (await screens.waitForScreen('FIG106M1')) {
				if ((await screens.getScreenText(10, 4, 10)).trim() === '') {
					if ((await screens.getScreenText(10, 4, 79)).replaceAll('_', '').trim() !== '' && !await screens.isProtected(10, 2, 1)) {
						await screens.typeAndEnter(10, 2, 'A')
						if (await screens.confirm(13, 3, 'Ex Distribution Price')) {
							await screens.typeAndEnter(13, 26, '1')
							if (await screens.isPleaseConfirm()) await screens.pleaseConfirm('Y')
						}
						if (!await screens.isProtected(10, 2, 1)) await screens.typeAndEnter(10, 2, 'V')
					}
				} else {
					const date = await screens.getScreenDate(10, 4, 7, 10)
					if (date.getTime() !== new Date(1899, 11, 30).getTime() && (date.getTime() !== fundValDate.getTime() || !await screens.confirm(10, 67, 'Verified'))) {
						if (await screens.confirm(10, 67, 'Inputed')) {
							await screens.typeAndEnter(10, 2, 'V')
							await screens.enter()
							if (await screens.confirm(1, 2, 'Please enter an Ex Distribution Price')) await screens.typeAndEnter(13, 26, '1')
							while (await screens.confirm(23, 20, 'Please Confirm')) await screens.typeAndEnter(23, 36, 'Y')
						} else if (date.getTime() !== fundValDate.getTime() && !await screens.confirm(10, 67, 'Completed')) {
							if (!await addNewDistributionRates(row, fundValDate)) return false
						}
					}
				}
			}
			await screens.setAction('PF12')
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 5)).trim() === '') return true
		await screens.setAction('PF8')
	}
}

export async function processFMCIA(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	while (true) {
		if (!await screens.gotoFmsScreen('FMCIA', 'FIS481M1')) return false

		await typeReportDestination(9, 2, 23, 'Report Destination')
		await screens.typeAndEnter(6, 23, investmentGroup.padStart(4, ' '))
		if (await screens.confirm(1, 2, 'Investment Group does not contain an Interest Bearing Option')) return true
		if (!await screens.waitForScreen('FIS481M2')) return false

		const currentDate = await screens.getScreenDate(12, 31, 36, 41)
		if (currentDate.getTime() === new Date(1899, 11, 30).getTime()) return false

		if (currentDate.getTime() === fundValDate.getTime()) {
			await screens.enter()
			if (!await screens.confirm(23, 20, 'Please Confirm')) return false

			const submittedAt = await screens.pleaseConfirm('Y')
			if (!await screens.confirm(2, 31, 'FMCIA has been submitted for processing')) return false

			return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
		}

		if (currentDate.getTime() > fundValDate.getTime()) return true

		await screens.typeAndEnterDate(14, 31, 36, 41, currentDate)
		while (
			await screens.confirm(1, 2, 'To date must fall on a Fund Valuation Date')
			&& !await screens.confirm(23, 20, 'Please Confirm')
		) {
			currentDate.setDate(currentDate.getDate() + 1)
			await screens.typeAndEnterDate(14, 31, 36, 41, currentDate)
		}

		if (!await screens.confirm(23, 20, 'Please Confirm')) return false

		const submittedAt = await screens.pleaseConfirm('Y')
		if (!await screens.confirm(2, 31, 'FMCIA has been submitted for processing')) return false

		if (!isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)) return false
	}
}

async function setDistributionRate(investmentGroup: string, investmentOption: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMDRM', 'FIS105M1')) return false

	await screens.type(5, 15, investmentGroup.padStart(4, ' '))
	const fromDate = await screens.getScreenDate(6, 36, 41, 46)
	fromDate.setFullYear(fromDate.getFullYear() - 3)
	await screens.typeDate(6, 15, 20, 25, fromDate)
	await screens.enter()
	if (!await screens.waitForScreen('FIG105M1')) return false

	while (true) {
		for (let row = 10; row <= 22; row += 1) {
			if (!investmentOption || (await screens.getInteger(row, 4, 4)).toString() !== Number.parseInt(investmentOption, 10).toString()) continue

			await screens.typeAndEnter(row, 2, 'S')
			const detailScreen = await screens.waitForScreen('FIB106M1')
			const alternateDetailScreen = !detailScreen && await screens.waitForScreen('FIG106M2')
			if (detailScreen || alternateDetailScreen) {
				const currentDate = await screens.getScreenDate(10, 4, 7, 10)
				const verifiedColumn = detailScreen ? 36 : 38
				if (currentDate.getTime() !== new Date(1899, 11, 30).getTime() && (currentDate.getTime() !== fundValDate.getTime() || !await screens.confirm(10, verifiedColumn, 'Verified'))) {
					if (!await addNewDistributionRates(row, fundValDate)) return false
				}
				await screens.setAction('PF12')
			} else if (await screens.waitForScreen('FIG106M1')) {
				if ((await screens.getScreenText(10, 4, 10)).trim() === '') {
					if (!await screens.isProtected(10, 2, 1)) {
						await screens.typeAndEnter(10, 2, 'A')
						if (await screens.confirm(13, 3, 'Ex Distribution Price')) {
							await screens.typeAndEnter(13, 26, '1')
							if (await screens.isPleaseConfirm()) await screens.pleaseConfirm('Y')
						}
					} else {
						await screens.setAction('PF12')
					}

					if (!await screens.isProtected(10, 2, 1)) {
						await screens.typeAndEnter(10, 2, 'V')
						if (await screens.confirm(13, 3, 'Ex Distribution Price')) {
							await screens.typeAndEnter(13, 26, '1')
							if (await screens.isPleaseConfirm()) await screens.pleaseConfirm('Y')
							await screens.setAction('PF12')
							return true
						}
					} else {
						await screens.setAction('PF12')
					}
				} else {
					const currentDate = await screens.getScreenDate(10, 4, 7, 10)
					if (currentDate.getTime() !== new Date(1899, 11, 30).getTime() && (currentDate.getTime() !== fundValDate.getTime() || !await screens.confirm(10, 67, 'Verified'))) {
						if (await screens.confirm(10, 67, 'Inputed')) {
							await screens.typeAndEnter(10, 2, 'V')
							await screens.enter()
							if (await screens.confirm(1, 2, 'Please enter an Ex Distribution Price')) await screens.typeAndEnter(13, 26, '1')
							while (await screens.confirm(23, 20, 'Please Confirm')) await screens.typeAndEnter(23, 36, 'Y')
							await screens.setAction('PF12')
						} else if (currentDate.getTime() !== fundValDate.getTime() && !await screens.confirm(10, 67, 'Completed')) {
							await addNewDistributionRates(row, fundValDate)
							await screens.setAction('PF12')
						} else {
							await screens.setAction('PF12')
						}
					} else {
						await screens.setAction('PF12')
					}
				}
			} else {
				await screens.setAction('PF12')
			}
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 5)).trim() === '') return true
		await screens.setAction('PF8')
	}
}

async function verifyDistributionRate(investmentGroup: string, investmentOption: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMDRM', 'FIS105M1')) return false

	const fromDate = await screens.getScreenDate(6, 36, 41, 46)
	fromDate.setFullYear(fromDate.getFullYear() - 3)
	await screens.typeAndEnterDate(6, 15, 20, 25, fromDate)
	await screens.typeAndEnter(5, 15, investmentGroup.padStart(4, ' '))

	const secondFromDate = await screens.getScreenDate(7, 36, 41, 46)
	secondFromDate.setFullYear(secondFromDate.getFullYear() - 3)
	await screens.typeAndEnterDate(7, 15, 20, 25, secondFromDate)
	if (!await screens.waitForScreen('FIG105M1')) return false

	const row = await getDistributionOptionRow(investmentOption)
	if (row <= 0) return false

	await screens.typeAndEnter(row, 2, 'S')
	if (!await screens.waitForScreen('FIG106M1')) return false
	if (!await screens.confirm(10, 67, 'Inputed')) return false

	await screens.typeAndEnter(10, 2, 'V')
	if (!await screens.waitForScreen('FIG107M4')) return false

	await screens.type(11, 26, '1')
	await screens.type(13, 26, '1')
	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
	await screens.pleaseConfirm('Y')
	return true
}

async function getDistributionOptionRow(investmentOption: string): Promise<number> {
	const option = Number.parseInt(investmentOption, 10)
	if (Number.isNaN(option)) return 0

	while (true) {
		for (let row = 10; row <= 22; row += 1) {
			if (await screens.getInteger(row, 4, 4) === option) return row
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 5)).trim() === '') return 0
		await screens.setAction('PF8')
	}
}

export async function processFMBS(fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMBS', 'FMS432M1')) return false

	if (await screens.confirm(12, 2, 'Print Hardcopy only')) await screens.type(12, 25, 'N')
	if (await screens.confirm(14, 2, 'Suppress Download')) await screens.type(14, 25, 'N')

	if (await screens.confirm(16, 2, 'Emails/Faxes to be sent out on')) {
		await screens.typeDate(16, 34, 39, 44, screens.getNextBusinessDay(fundValDate))
	}

	await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMBS has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPRPC(_fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPRPC', 'FIB125M3')) return false
	if (!await screens.confirm(9, 15, 'Product group to be processed')) return false

	await screens.typeAndEnter(9, 47, '1')
	if (await screens.confirm(2, 2, 'No CMT product to be processed')) return true

	throw new Error('Not yet implemented')
}

export async function processFMFCPS(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMFCPS', 'FIC418M1')) return false

	if (await screens.confirm(11, 6, 'Investment Group')) await screens.type(11, 28, investmentGroup.padStart(4, '0'))
	await screens.enter()
	await screens.waitForScreen('FIC418M2')
	await typeReportDestination(20, 2, 22, 'Report Dest')

	if (await screens.confirm(13, 2, 'Which job would you like to run')) await screens.type(13, 36, '1')

	if (await screens.confirm(11, 3, 'Month End Date')) {
		const previousMonth = new Date(fundValDate)
		previousMonth.setMonth(previousMonth.getMonth() - 1)
		await screens.type(11, 21, previousMonth.getFullYear().toString().padStart(4, '0'))
		await screens.type(11, 28, (previousMonth.getMonth() + 1).toString().padStart(2, '0'))
	}

	await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMFCPS has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPSM(option: string, investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPSM', 'FIC665M1')) return false

	await typeReportDestination(21, 2, 22, 'Report Dest')
	await screens.type(6, 23, investmentGroup.padEnd(4, ' '))
	await screens.type(8, 36, option)
	await screens.enter()

	if (await screens.confirm(9, 14, 'Printer Id HELP')) await screens.typeAndEnter(12, 14, 'S')
	if (await screens.confirm(13, 8, 'Are you sure this is the month end valuation')) await screens.typeAndEnter(13, 58, 'Y')

	const feeAndRebateProcessDate = parseScreenDate(await screens.getScreenTextTrimmed(17, 36, 10))
	if (feeAndRebateProcessDate.getTime() > fundValDate.getTime()) return true

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMPSM has been submitted for processing')) return false

	return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, submittedAt)
}

export async function processFMTCFP(investmentGroup: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMTCFP', 'FIS425M1')) return false

	await screens.type(7, 24, investmentGroup.padStart(4, '0'))
	await typeReportDestination(11, 2, 24, 'Report Destination')
	await screens.enter()
	if (await screens.confirm(1, 2, 'Trailing Commission not required')) return true

	const submittedAt = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMTCFP has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
	}

	if (await screens.confirm(2, 32, 'FMTCFP has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
	}

	return false
}

export async function processFMPDDD(_fundValDate: Date, option: string): Promise<boolean> {
	if (!await screens.gotoFMPDDDscreen()) return false

	const isUnitTrust = option === '1' && await screens.confirm(7, 29, 'Unit Trust')
	const isRolloverOrSuper = option === '2' && await screens.confirm(9, 29, 'Rollover and Superannuation Fund')
	if (!isUnitTrust && !isRolloverOrSuper) return false

	await screens.typeAndEnter(18, 44, option)
	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMPDDD has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPMIP(_fundValDate: Date, option: string): Promise<boolean> {
	if (!await screens.gotoFMPMIPDscreen()) return false
	if (!await screens.confirm(13, 17, 'Unit Trust')) return false

	await screens.typeAndEnter(9, 44, option)
	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMPMIPD has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPMIPD(fundValDate: Date, option: string): Promise<boolean> {
	return processFMPMIP(fundValDate, option)
}

async function findFMATMRow(accountNumber: string, description: string): Promise<number> {
	for (let row = 10; row <= 21; row += 1) {
		const rowText = await screens.getScreenTextTrimmed(row, 2, 79)
		if (rowText.includes(accountNumber) && rowText.includes(description)) return row
	}

	return 0
}

export async function processFMAR(environment: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMAR', 'FIS310M1')) return false

	if (environment === 'UAT1') {
		await screens.typeAndEnter(6, 21, '067979000001573')
	} else if (environment === 'UAT2') {
		await screens.typeAndEnter(6, 21, '067979000059084')
	} else {
		const row = await findFMATMRow('008033000856768', 'Rdm')
		if (row <= 0) return false

		await screens.typeAndEnter(row, 2, 'S')
		if (!await screens.waitForScreen('FIN206M9')) return false
		await screens.setAction('PF12')
		if (!await screens.gotoFmsScreen('FMAR', 'FIS310M1')) return false
		await screens.enter()
	}

	while (await screens.confirm(2, 27, 'Press ENTER to continue')) await screens.enter()
	while (await screens.confirm(15, 25, 'Please ENTER to continue')) await screens.enter()
	if (!await screens.waitForScreen('FIN130M1')) return false
	if (await screens.confirm(15, 23, 'Please ENTER to continue')) await screens.enter()

	await screens.type(9, 15, '12')
	await screens.type(10, 18, '09')
	await screens.typeAndEnter(12, 15, '1'.padEnd(12, ' '))
	await screens.typeAndEnter(11, 26, 'Y')
	await screens.typeAndEnter(19, 53, 'Y')

	while (await screens.confirm(17, 25, 'Continue ? (Y/N)')) await screens.typeAndEnter(17, 44, 'Y')
	await screens.pleaseConfirm('Y')

	while (await screens.confirm(19, 5, 'Do you wish to release the Preserved Benefit')) {
		await screens.typeAndEnter(19, 51, 'Y')
		await screens.pleaseConfirm('Y')
	}

	if (!await screens.waitForScreen('FIN130M2')) return false
	if (await screens.confirm(18, 35, 'Continue') && !await screens.isProtected(18, 53, 1)) await screens.typeAndEnter(18, 53, 'Y')
	if (await screens.confirm(19, 37, 'Continue') && !await screens.isProtected(19, 53, 1)) await screens.typeAndEnter(19, 53, 'Y')
	if (!await screens.isProtected(6, 79, 1)) await screens.typeAndEnter(6, 79, 'Y')
	await screens.pleaseConfirm('Y')

	if (!await screens.waitForScreen('FIN132M1')) return false
	while (await screens.confirm(3, 2, 'FIN132M1')) await screens.enter()
	if (!await screens.waitForScreen('FIN862M2')) return false

	while (await screens.confirm(3, 2, 'FIN862M2')) {
		await screens.enter()
		if (await screens.confirm(23, 20, 'Please Confirm')) await screens.pleaseConfirm('Y')
	}

	if (await screens.isProgramName('FIN130M2')) return false
	if (!await screens.waitForScreen('FIN135M1')) return false

	await screens.type(8, 2, 'A')
	await screens.type(8, 4, 'D')
	await screens.enter()
	await screens.enter()

	if (await screens.confirm(2, 10, 'Please enter either a USI or Super Fund Acct')) {
		await screens.type(11, 27, environment === 'UAT1' || environment === 'UAT2' ? 'AMP0195AU' : 'BTA0280AU')
		await screens.type(13, 27, '009')
		await screens.type(13, 33, '003')
		await screens.type(14, 27, '1234567890')
	}

	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
	await screens.pleaseConfirm('Y')
	return screens.confirm(2, 2, 'Redemption has been ACCEPTED')
}

export async function processFMRBFSR(_fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMRBFSR', 'FMS498M1')) return false

	await typeReportDestination(12, 2, 18, 'Report Dest')
	await screens.setAction('ENTER')
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMRBFSR has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMRBRR(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMRBRR', 'FMS794M1')) return false

	if (await screens.confirm(7, 12, 'Investment Group')) await screens.type(7, 35, investmentGroup.padStart(4, '0'))
	if (await screens.confirm(14, 12, 'Report Only')) await screens.type(14, 35, 'N')
	if (await screens.confirm(15, 12, 'Report Type')) await screens.type(15, 35, 'D')
	await typeReportDestination(17, 12, 28, 'Download Dest')

	await screens.type(12, 40, (fundValDate.getMonth() + 1).toString().padStart(2, '0'))
	await screens.type(12, 45, fundValDate.getFullYear().toString().padStart(4, '0'))

	while (!await screens.confirm(23, 20, 'Please Confirm')) {
		await screens.enter()
		await screens.setAction('SELECT_PRINTER:N2R33')

		if (await screens.confirm(1, 2, "Previous month's journal were not sent to FDM yet")) return false

		if (await screens.confirm(1, 2, 'Next process date is')) {
			const displayedDate = await screens.getScreenDate(1, 29, 27, 23)
			if (displayedDate.getTime() <= fundValDate.getTime()) {
				await screens.type(12, 40, (displayedDate.getMonth() + 1).toString().padStart(2, '0'))
				await screens.type(12, 45, displayedDate.getFullYear().toString().padStart(4, '0'))
			} else {
				return true
			}
		}

		if (await screens.confirm(1, 2, 'Cannot Process, Last Fund Val must be')) return false
		if (await screens.confirm(1, 2, 'Wholesale fee rebate not applicable to Ivst Grup')) return true
	}

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.waitForScreen('FIS818M1')) return false
	if (await screens.confirm(2, 31, 'FMPRBMR has been submitted for processing') || await screens.confirm(2, 32, 'FMPRBMR has been submitted for processing')) {
		return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, submittedAt)
	}

	return false
}

export async function processFMPRBMR(investmentGroup: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPRBMR', 'FIS818M1')) return false

	if (await screens.confirm(6, 12, 'Investment Group')) await screens.type(6, 35, investmentGroup.padStart(4, '0'))
	await typeReportDestination(16, 12, 35, 'Report Destination')

	await screens.waitForScreen('FIS818M1')
	if (await screens.confirm(1, 2, 'Wholesale fee rebate not applicable to Ivst Grup')) return true
	await screens.waitForScreen('FIS818M1')
	if (await screens.confirm(1, 2, 'Wholesale fee rebate not applicable to Ivst Grup')) return true

	while (!await screens.confirm(23, 20, 'Please Confirm')) {
		if (await screens.confirm(1, 2, 'Wholesale fee rebate not applicable to Ivst Grup')) return true
		await screens.enter()
	}

	const submittedAt = await screens.pleaseConfirm('Y')
	await screens.waitForScreen('FIS818M1')
	if (await screens.confirm(2, 31, 'FMPRBMR has been submitted for processing') || await screens.confirm(2, 32, 'FMPRBMR has been submitted for processing')) {
		return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, submittedAt)
	}

	return false
}

export async function processFMPDCD(investmentGroup: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPDCD', 'FMS485M1')) return false

	if (await screens.confirm(7, 2, 'Investment Grup')) await screens.type(7, 22, investmentGroup.padStart(4, '0'))
	if (await screens.confirm(12, 2, 'Process Distribution Income Payment')) await screens.type(12, 40, 'Y')
	if (await screens.confirm(13, 2, 'Process Variable Int. Drawing')) await screens.type(13, 40, 'N')
	if (await screens.confirm(14, 2, 'Process Interest Payment')) await screens.type(14, 40, 'N')
	if (await screens.confirm(17, 2, 'Variable Interest Paid')) await screens.type(17, 40, 'N')

	const timeout = Date.now() + 5_000
	while (Date.now() < timeout && !await screens.isPleaseConfirm()) await screens.enter()
	if (!await screens.isPleaseConfirm()) return false

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.waitForScreen('FIS460M1')) return false
	if (await screens.confirm(2, 31, 'FMPDCD has been submitted for processing') || await screens.confirm(2, 32, 'FMPDCD has been submitted for processing')) {
		return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, submittedAt)
	}

	return false
}

export async function processFMPPD(investmentGroup: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPPD', 'FMS259M1')) return false

	await screens.typeAndEnter(12, 26, investmentGroup.padEnd(4, ' '))
	if (await screens.confirm(1, 2, 'There are no DES applications requested')) return true

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 2, 'Job : FBS751B For Function : FMPPD has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMMFRP(_fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMMFRP', 'FIS843M1')) return false

	for (let row = 12; row <= 22; row += 1) {
		const scheme = await screens.getInteger(row, 2, 3)
		if (scheme > 0) {
			await screens.type(6, 22, scheme.toString().padStart(3, '0'))
			await screens.type(7, 22, '1')
			await screens.enter()
		}
	}

	return true
}

export async function processFMMFA(_environment: string, investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFMMFAscreen()) return false
	if (!await screens.waitForScreen('FIS735M1')) return true

	await screens.type(8, 21, investmentGroup.padStart(4, '0'))
	await screens.type(12, 21, (fundValDate.getMonth()).toString().padStart(2, '0'))
	await screens.type(12, 31, fundValDate.getFullYear().toString().padStart(4, '0'))
	await screens.type(19, 25, '1')
	await screens.enter()

	if (await screens.confirm(2, 2, 'No Payments are available for First Level Authorisation')) return true
	if (await screens.confirm(2, 2, 'No Payments are available for Second Level Authorisation')) return true

	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMMFA has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPMFI(_fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFMPMFIscreen()) return false

	await screens.typeAndEnter(18, 31, '1')
	if (!await screens.waitForScreen('FIS741M1')) return false

	await screens.type(11, 18, _fundValDate.getMonth().toString().padStart(2, '0'))
	await screens.type(11, 28, _fundValDate.getFullYear().toString().padStart(4, '0'))
	await typeReportDestination(19, 2, 22, 'Report Destination')
	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMPMFI has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function getSystemDate(): Promise<Date> {
	if (!await screens.gotoFmsScreen('FMSD', 'FIS953M1')) return new Date(1899, 11, 30)
	return screens.getScreenDate(6, 40, 43, 46)
}

export async function processFMMFD(_investmentGroup: string, _fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFMMFDscreen()) return false

	await typeReportDestination(10, 2, 22, 'Report Destination')
	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()

	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 21, 'DES processing job(s) submitted')) return false

	const status = await screens.getScreenText(2, 2, 70)
	let jobNames = status.split(/\s+/).filter((item) => item.toUpperCase().startsWith('FB'))
	if (jobNames.length === 0) jobNames = status.split(/\s+/).filter((item) => item.toUpperCase().startsWith('FM'))
	if (jobNames.length === 0) return false

	return jobNames.every((jobName) => isJobCompleted(jobName, submittedAt))
}

export async function processFMCFP(_fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMCFP', 'FIS420M1')) return false

	await typeReportDestination(12, 2, 24, 'Report Destination')
	await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMCFP has been submitted for processing')) return false

	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}

export async function processFMPASF(_fundValDate: Date, option: string): Promise<boolean> {
	const fundValDate = _fundValDate
	if (!await screens.gotoFmsScreen('FMPASF', 'FIS156M1')) return false
	if (!await screens.confirm(9, 13, 'Product group to be processed')) return false

	await screens.typeAndEnter(9, 44, option)
	while (
		await screens.confirm(2, 38, '<Enter> to continue')
		|| await screens.confirm(2, 39, '<Enter> to continue')
		|| await screens.confirm(2, 43, '<Enter> to continue')
	) await screens.enter()

	const currentRunDate = await screens.getScreenDate(8, 29, 32, 35)
	const lowerBound = new Date(fundValDate)
	lowerBound.setDate(lowerBound.getDate() - 7)
	const upperBound = new Date(fundValDate)
	upperBound.setDate(upperBound.getDate() + 7)

	if (currentRunDate.getTime() >= lowerBound.getTime() && currentRunDate.getTime() <= upperBound.getTime()) {
		if (await screens.confirm(23, 20, 'Please Confirm')) {
			const submittedAt = await screens.pleaseConfirm('Y')
			if (!await screens.waitForScreen('FIA157M1')) return false
			if (await screens.confirm(2, 31, 'FMPASF has been submitted for processing')) {
				return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), '', submittedAt)
			}
			return false
		}

	}

	if (await screens.isProgramName('FIG157M1')) {
		const lastAutomaticDate = await screens.getScreenDate(8, 29, 32, 35)
		return lastAutomaticDate.getTime() === fundValDate.getTime()
	}

	return false
}

export async function processFMPDD(_fundValDate: Date, option: string): Promise<boolean> {
	if (!await screens.gotoFMPDDscreen()) return false
	if (!await screens.confirm(7, 29, 'Unit Trust')) return false

	await screens.typeAndEnter(18, 44, option)
	await typeReportDestination(21, 2, 25, 'Report Destination')
	if (await screens.confirm(2, 2, "The listed products must have status 'open'")) return false
	if (await screens.confirm(2, 2, 'Last direct debit date not the same for all products')) return false

	while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	return isJobCompleted('FMN128B', submittedAt)
}

export async function processFMAPTP(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMAPTP', 'FIS122M1')) return false

	await screens.typeAndEnter(7, 22, investmentGroup.padStart(4, ' '))
	if (!await screens.waitForScreen('FIB122M1')) await screens.waitForScreen('FIS122M1')
	if (await screens.confirm(2, 2, 'No Pending Redemption to process')) return true
	if (await screens.confirm(1, 2, 'Product Type not allowed')) return true
	if (await screens.confirm(3, 22, 'Invalid Ivestment Group')) return false

	if (await screens.confirm(11, 38, 'IS OUT OF BALANCE')) {
		await screens.typeAndEnter(15, 27, 'S')
		return false
	}

	return false
}

async function findFMDIRMRow(investmentGroup: string): Promise<number> {
	while (true) {
		for (let row = 10; row <= 22; row += 1) {
			if (await screens.getInteger(row, 6, 4) === Number.parseInt(investmentGroup, 10)) return row
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 1)).trim() === '') return 0
		await screens.setAction('PF8')
	}
}

async function getFMDIRMRow(effectiveDate: Date): Promise<number> {
	for (let row = 9; row <= 20; row += 1) {
		const date = await screens.getScreenDate(row, 4, 7, 10)
		if (date.getTime() === effectiveDate.getTime()) return row
	}

	return 0
}

async function verifyFMDIRMdata(): Promise<boolean> {
	if (await screens.confirm(10, 20, 'Complete') || await screens.confirm(10, 20, 'Verified')) {
		await screens.setAction('PF12')
		return true
	}

	return false
}

async function enterFMDIRMdata(_effectiveDate: Date, _typeOfInterestRate: string, _fixedInterestRate: string, _fromRandomInterestRate: string, _toRandomInterestRate: string): Promise<boolean> {
	return false
}

export async function processFMDIRM(investmentGroup: string, effectiveDate: Date, typeOfInterestRate: string, fixedInterestRate: string, fromRandomInterestRate: string, toRandomInterestRate: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMDIRM', 'FIS863M1')) return false

	const investmentGroupRow = await findFMDIRMRow(investmentGroup)
	if (investmentGroupRow <= 0) return false

	await screens.typeAndEnter(investmentGroupRow, 2, 'S')
	if (!await screens.waitForScreen('FIS863M2')) return false

	while (true) {
		for (let row = 9; row <= 20; row += 1) {
			if (await screens.getInteger(row, 4, 4) <= 0) return true
			const description = await screens.getScreenTextTrimmed(row, 9, 64)
			if (description.includes('TD') || description.includes('Term')) continue

			await screens.typeAndEnter(row, 2, 'H')
			if (!await screens.waitForScreen('FIS863M3')) return false

			for (let nextDate = new Date(effectiveDate); nextDate <= effectiveDate; nextDate.setDate(nextDate.getDate() + 1)) {
				const nextRow = await getFMDIRMRow(nextDate)
				if (nextRow > 0) {
					if (!await screens.confirm(nextRow, 20, 'Complete') && !await screens.confirm(nextRow, 20, 'Verified')) return false
				} else {
					if (!await enterFMDIRMdata(nextDate, typeOfInterestRate, fixedInterestRate, fromRandomInterestRate, toRandomInterestRate)) return false
					if (!await verifyFMDIRMdata()) return false
					await screens.typeAndEnter(row, 2, 'H')
					if (!await screens.waitForScreen('FIS863M3')) return false
				}
			}

			const currentDate = await screens.getScreenDate(10, 4, 7, 10)
			if (currentDate.getTime() === effectiveDate.getTime()) {
				if (await screens.confirm(10, 20, 'Complete') || await screens.confirm(10, 20, 'Verified')) {
					await screens.setAction('PF12')
				} else {
					await screens.typeAndEnter(10, 2, 'V')
					if (!await screens.waitForScreen('FIS863M4')) return false
					while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
					await screens.typeAndEnter(23, 36, 'Y')
					return true
				}
			} else {
				if (!await enterFMDIRMdata(effectiveDate, typeOfInterestRate, fixedInterestRate, fromRandomInterestRate, toRandomInterestRate)) return false
				if (!await verifyFMDIRMdata()) return false
			}
		}

		if ((await screens.getScreenTextTrimmed(24, 50, 1)).trim() === '') return true
		await screens.setAction('PF8')
	}
}

export async function processFMDP(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	let repeat = true

	while (repeat) {
		repeat = false

		if (!await screens.gotoFmsScreen('FMDP', 'FIS480M1')) return false

		await typeReportDestination(12, 2, 18, 'Report Server')
		await screens.typeAndEnter(6, 22, investmentGroup.padStart(4, ' '))

		if (await screens.waitForScreen('FIS480M1')) {
			if (await screens.confirm(10, 16, 'Have you confirmed Non-Resident Withholding')) {
				await screens.typeAndEnter(11, 44, 'Y')
				if (await screens.waitForScreen('FIG107M5')) {
					while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
					const submittedAt = await screens.pleaseConfirm('Y')
					if (!await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
					return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
				}

			}

			if (await screens.confirm(1, 2, 'Unverified bank account report not required for this product type')) {
				await screens.typeAndEnter(12, 18, ' '.repeat(8))
				if (!await screens.confirm(23, 20, 'Please Confirm')) return false

				const submittedAt = await screens.pleaseConfirm('Y')
				if (!await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
				return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
			}

			if (await screens.confirm(1, 2, 'Dist rate for group prod')) {
				if (await processFMDRM(investmentGroup, fundValDate)) repeat = true
				else return false
			}

			if (await screens.confirm(23, 20, 'Please Confirm')) {
				const submittedAt = await screens.pleaseConfirm('Y')
				const submitted = await screens.confirm(2, 2, 'Job : FBS482B For Function : FMDP has been submitted for processing')
				if (!submitted && !await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
				return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
			}

			return false
		}

		if (await screens.waitForScreen('FIS480M2')) {
			if (await screens.confirm(1, 2, 'Unverified bank account report not required for this product type')) {
				await screens.typeAndEnter(12, 18, ' '.repeat(8))
				if (!await screens.confirm(23, 20, 'Please Confirm')) return false

				const submittedAt = await screens.pleaseConfirm('Y')
				if (!await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
				return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
			}

			if (investmentGroup === '70' || investmentGroup === '91') {
				if (await screens.confirm(16, 2, 'Process UT Income Distribution')) await screens.type(16, 40, 'N')
				if (await screens.confirm(17, 2, 'Process ML Variable Interest Charge')) await screens.type(17, 40, 'N')
				if (await screens.confirm(18, 2, 'Process UT Credit Interest Payment')) await screens.type(18, 40, 'Y')
				await screens.enter()

				if (await screens.confirm(1, 2, 'No Distribution is required for this product')) {
					if (await screens.confirm(16, 2, 'Process UT Income Distribution')) await screens.type(16, 40, 'Y')
					if (await screens.confirm(17, 2, 'Process ML Variable Interest Charge')) await screens.type(17, 40, 'N')
					if (await screens.confirm(18, 2, 'Process UT Credit Interest Payment')) await screens.type(18, 40, 'N')
					await screens.enter()
				}

				if (await screens.confirm(1, 2, 'Please input and verify rate for group prod')) {
					const split = (await screens.getScreenText(1, 2, 79)).trim().split(' ')
					if (!await setDistributionRate(investmentGroup, split[8] ?? '', fundValDate)) return false
					repeat = true
				}

				const screenText = (await screens.getScreenText(1, 2, 79)).trim()
				if (screenText.startsWith('Dist rate for group prod') && screenText.endsWith('has not been entered')) {
					const split = screenText.split(' ')
					if (!await setDistributionRate(investmentGroup, split[5] ?? '', fundValDate)) return false
					repeat = true
				}
				if (await screens.confirm(1, 2, 'Interest Accrual for') && await screens.confirm(1, 32, 'must be run before interest distribution')) return false
			} else {
				if (await screens.confirm(16, 2, 'Process UT Income Distribution')) await screens.type(16, 40, 'Y')
				if (await screens.confirm(17, 2, 'Process ML Variable Interest Charge')) await screens.type(17, 40, 'N')
				if (await screens.confirm(18, 2, 'Process UT Credit Interest Payment')) await screens.type(18, 40, 'N')
				await screens.enter()
			}

			if (repeat) continue
			if (await screens.confirm(1, 2, 'No Distribution is required for this product')) return true

			if (await screens.confirm(10, 16, 'Have you confirmed Non-Resident Withholding')) {
				await screens.typeAndEnter(11, 44, 'Y')
				await screens.enter()
			}

			if (await screens.confirm(1, 2, 'Please input and verify rate for group prod')) return false
			if (await screens.confirm(1, 2, 'Distribution rate for group prod')) {
				const split = (await screens.getScreenText(1, 2, 60)).split(' ')
				if (!await verifyDistributionRate(investmentGroup, split[5] ?? '', fundValDate)) return false
				return processFMDP(investmentGroup, fundValDate)
			}
			if (await screens.confirm(1, 2, 'Interest Accrual for') && await screens.confirm(1, 32, 'must be run before interest distribution')) return false
			if (await screens.confirm(1, 2, 'Distribution has been applied')) return true

			while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
			const submittedAt = await screens.pleaseConfirm('Y')
			if (!await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
			return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
		}

		if (await screens.isProgramName('FIG107M5')) {
			while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
			const submittedAt = await screens.pleaseConfirm('Y')
			if (!await screens.confirm(2, 31, 'FMDP has been submitted for processing')) return false
			return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
		}

		return false
	}

	return false
}

function isJobAlreadySuccessful(_processName: string): boolean {
	return false
}

function isJobCompleted(_jobName: string, _submittedAt: Date): boolean {
	return false
}

async function getFileNumber(environment: string, fundValDate: Date): Promise<number> {
	if (!environment || !fundValDate || !await screens.gotoFmsScreen('FMDJC', 'FIS745M1')) return 0

	await screens.clearScreenText(20, 25, 8)
	await screens.enter()

	let fileNumber = 0
	while (true) {
		for (let row = 10; row <= 21; row += 2) {
			if (!await screens.isProtected(row, 2, 1)) {
				if (await screens.getScreenText(row + 1, 76, 3) === 'Com') {
					const candidate = await screens.getInteger(row, 21, 3)
					const transactionCount = await screens.getInteger(row, 54, 8)
					if (candidate > 0 && transactionCount > 0) fileNumber = candidate
				} else {
					return 0
				}
			}
		}

		if ((await screens.getScreenText(24, 50, 1)).trim() === '') return fileNumber
		await screens.setAction('PF8')
	}
}

export async function getDESJobControlRow(): Promise<number> {
	while (true) {
		for (let row = 10; row <= 21; row += 2) {
			if (await screens.getScreenTextTrimmed(row, 4, 8) !== '') return row
		}

		if (await screens.getScreenTextTrimmed(24, 50, 1) === '') return 0
		await screens.setAction('PF8')
	}
}

export async function processFMDC(environment: string, companyName: string, fundValDate: Date): Promise<boolean> {
	const fileNumber = await getFileNumber(environment, fundValDate)
	if (fileNumber <= 0) {
		await writeToProcessingLog(environment, companyName, fundValDate, 'FMDC not executed because FMDJC says no transactions')
		return true
	}

	if (isJobAlreadySuccessful('FMDC')) return true
	if (!await screens.gotoFmsScreen('FMDC', 'FIS747M1')) return false
	if (await screens.confirm(2, 2, 'No file with input status is found in the last')) return true

	await screens.confirm(18, 19, 'was last collated on')
	if (!await screens.confirm(8, 2, 'Mode of Run')) return false

	await screens.typeAndEnter(6, 28, fileNumber.toString().padStart(3, '0'))
	await screens.typeAndEnter(12, 2, 'Report Destination')
	await screens.typeAndEnter(8, 22, 'U')

	if (await screens.isProgramName('FIS746M1')) {
		while (!await screens.isPleaseConfirm()) await screens.enter()
		const submittedAt = await screens.pleaseConfirm('Y')
		if (!await screens.confirm(2, 31, 'FMDC has been submitted for processing')) return false
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
	}

	if (!await screens.waitForScreen('FIS747M1')) return false
	if (await screens.confirm(2, 17, 'is not found to collate in the last')) return true
	if (await screens.confirm(1, 2, "Value 'N' is not applicable in Update Mode execution")) {
		await screens.typeAndEnter(14, 23, 'Y')
	}
	if (!await screens.waitForScreen('FIS746M1')) return false
	if (!await screens.confirm(6, 2, 'Date From') || !await screens.confirm(7, 2, 'File')) return false

	while (!await screens.waitForScreen('FIS747M3')) await screens.enter()
	const submittedAt = await screens.pleaseConfirm('Y')
	if (!await screens.confirm(2, 31, 'FMDC has been submitted for processing')) return false
	return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)
}