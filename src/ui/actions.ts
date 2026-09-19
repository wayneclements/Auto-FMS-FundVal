import { writeToProcessingLog as writeProcessingLogEntry } from './database'
import * as screens from './screens.ts'

const timeoutSeconds = 60

export async function writeToProcessingLog(environment: string, companyName: string, fundValDate: Date, text: string, ...list: string[]): Promise<void> {
	const message = list.length > 0
		? text.replace(/\{(\d+)\}/g, (placeholder, index: string) => list[Number(index)] ?? placeholder)
		: text

	await writeProcessingLogEntry(environment, companyName, fundValDate, message)
}

export async function getListOfInvestmentGroupStatus(): Promise<Map<string, boolean>> {
	const statuses = new Map<string, boolean>()

	if (!await screens.gotoFmsScreen('FMIGM', 'FIS040M1')) return statuses

	const firstRow = 9
	const lastRow = 21
	const emptyScreenDate = new Date(1899, 11, 30).getTime()

	while (true) {
		for (let row = firstRow; row <= lastRow; row += 1) {
			const investmentGroup = (await screens.getInteger(row, 4, 4)).toString()
			if (investmentGroup !== '0') {
				const closeDate = await screens.getScreenDate(row, 49, 52, 55)
				statuses.set(investmentGroup, closeDate.getTime() !== emptyScreenDate)
			}
		}

		if (await screens.getScreenTextTrimmed(24, 50, 1) === '') {
			statuses.set("10", false);
			statuses.set("11", true);
			statuses.set("50", false);
			statuses.set("51", true);
			statuses.set("60", false);
			statuses.set("65", true);
			statuses.set("70", true);
			statuses.set("71", true);
			statuses.set("90", true);
			statuses.set("91", true);
			statuses.set("120", true);
			return statuses
		}

		await screens.setAction('PF8')
	}
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

export async function processFMPPFR(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPPFR', 'FIA445M1')) return false

	await screens.typeAndEnter(18, 2, 'Excel Report Dest')
	await screens.typeAndEnter(7, 22, investmentGroup.padStart(4, ' '))
	const submittedAt = await screens.pleaseConfirm('Y')

	if (!await screens.confirm(2, 31, 'FMPPFR has been submitted for processing')) return false

	const jobName = await screens.getScreenTextTrimmed(2, 8, 8)
	return isRunningJobCompleted(jobName, investmentGroup, submittedAt)
}

export async function processFMPPP(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPPP', 'FIA450M1')) return false

	await typeReportDestination(10, 2, 22, 'Excel Report Dest')
	await typeReportDestination(21, 2, 18, 'Report Server')
	await screens.typeAndEnter(7, 22, investmentGroup.padStart(4, ' '))
	await screens.waitForScreen('FIA450M1')
	const dateTimeNow = await screens.pleaseConfirm('Y')

	if (await screens.confirm(2, 31, 'FMPPP has been submitted for processing')) {
		return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, dateTimeNow)
	}

	return false
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

export async function processFMPIV(fundValDate: Date): Promise<boolean> {
	if (await isJobAlreadySuccessful('FMPIV')) return true
	if (!await screens.gotoFmsScreen('FMPIV', 'FIS696M1')) return false

	await typeReportDestination(19, 4, 39, 'Report Destination')
	if (await screens.confirm(2, 2, 'FMPIV for this company should be run in Cpny - 001')) {
		return screens.confirm(4, 2, '008')
	}

	if (await screens.confirm(6, 46, 'AUNSW')) await screens.typeDate(8, 25, 30, 35, fundValDate)
	if (await screens.confirm(6, 46, 'NZAUK')) await screens.typeDate(8, 42, 47, 52, fundValDate)
	await screens.enter()

	if (await screens.confirm(1, 2, 'FMPIV Date must after last FMPI Date for location AUNSW')) return true
	if (await screens.confirm(1, 2, "Please enter 'Y'es for a future date for location AUNSW")) await screens.typeAndEnter(17, 39, 'Y')
	if (await screens.confirm(1, 2, 'FMPI Run Date cannot be a weekend or public holiday')) return true

	const dateTimeNow = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMPIV has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), dateTimeNow)
	}

	return false
}

async function getFundValuationRatesMaintenanceRow(_fundValDate: Date, ..._statuses: string[]): Promise<number> {
	return 0
}

async function getCFFundValuationRatesMaintenanceRow(_fundValDate: Date): Promise<number> {
	return 0
}

async function verifyFundValuationRatesMaintenanceRow(_row: number): Promise<boolean> {
	return false
}

async function processFMFVRMverify(_row: number, _fundValDate: Date): Promise<boolean> {
	return false
}

async function enterFMFVRMeffectiveDate(_fundValDate: Date): Promise<void> {
}

async function enterFMFVRMspecialRateFlag(_fundValDate: Date): Promise<void> {
}

function smallRandom(multiplier: number): number {
	return Math.floor(Math.random() * (1000 * multiplier)) / 1000
}

async function updateExistingRates(): Promise<void> {
	const firstRow = 10
	const lastRow = 21

	while (await screens.getInteger(5, 70, 2) > 1) await screens.setAction('PF7')

	while (true) {
		for (let row = firstRow; row <= lastRow; row++) {
			let spread = 0.001
			if ((await screens.getScreenText(row, 7, 20)).includes('Cash')) spread = 0.000

			const issuePrice = await screens.getDecimal(row, 28, 8)
			let redeemPrice = issuePrice
			if (redeemPrice > spread) redeemPrice -= spread
			const netAssetPrice = (issuePrice + redeemPrice) / 2
			const unitMfp = netAssetPrice

			if (!await screens.isProtected(row, 28, 8)) await screens.type(row, 28, issuePrice.toFixed(4))
			if (!await screens.isProtected(row, 37, 8)) await screens.type(row, 37, redeemPrice.toFixed(4))
			if (!await screens.isProtected(row, 46, 11)) await screens.type(row, 46, netAssetPrice.toFixed(4))
			if (!await screens.isProtected(row, 58, 11)) await screens.type(row, 58, unitMfp.toFixed(4))
		}

		if (await screens.getScreenTextTrimmed(24, 50, 1) === '') return

		await screens.setAction('PF8')
	}
}

async function addMissingRates(): Promise<void> {
	const firstRow = 10
	const lastRow = 21

	while (true) {
		for (let row = firstRow; row <= lastRow; row++) {
			let spread = 0.001
			if ((await screens.getScreenText(row, 7, 20)).includes('Cash')) spread = 0.000

			const issuePrice = smallRandom(1)
			let redeemPrice = issuePrice
			if (redeemPrice > spread) redeemPrice -= spread
			const netAssetPrice = (issuePrice + redeemPrice) / 2
			const unitMfp = netAssetPrice

			if (await screens.getDecimal(row, 28, 8) === 0 && !await screens.isProtected(row, 28, 8)) await screens.type(row, 28, issuePrice.toFixed(4))
			if (await screens.getDecimal(row, 37, 8) === 0 && !await screens.isProtected(row, 37, 8)) await screens.type(row, 37, redeemPrice.toFixed(4))
			if (await screens.getDecimal(row, 46, 11) === 0 && !await screens.isProtected(row, 46, 11)) await screens.type(row, 46, netAssetPrice.toFixed(4))
			if (await screens.getDecimal(row, 58, 11) === 0 && !await screens.isProtected(row, 58, 11)) await screens.type(row, 58, unitMfp.toFixed(4))
		}

		if (await screens.getScreenTextTrimmed(24, 50, 1) === '') return

		await screens.setAction('PF8')
	}
}

export async function processFMFVRM(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMFVRM', 'FIS051M1')) return false

	await screens.typeAndEnter(5, 15, investmentGroup.padStart(4, ' '))
	if (await screens.confirm(8, 14, 'Invalid Printer ID')) await screens.typeAndEnter(12, 14, 'S')

	if (await screens.waitForScreen('FIG102M2')) {
		let row = await getFundValuationRatesMaintenanceRow(fundValDate)
		if (row > 0) {
			if (await screens.confirm(row, 46, 'Verified')) return true
			if (await processFMFVRMverify(row, fundValDate)) return screens.confirm(row, 46, 'Verified')
			return false
		}

		if (!await screens.waitForScreen('FIG102M2')) return false

		while (await screens.getInteger(5, 70, 2) > 1) await screens.setAction('PF7')

		if (await screens.confirm(10, 4, '') && await screens.isProtected(10, 4, 1)) {
			await screens.typeAndEnter(10, 2, 'C')
			if (!await screens.waitForScreen('FIG103M1', 'FIG103M3', 'FIG103M4')) return false

			if (await screens.confirm(7, 2, 'Effective Date')) await screens.typeDate(7, 19, 24, 29, fundValDate)
			if (await screens.confirm(8, 2, 'Special Rate')) await screens.type(8, 19, ' ')
			await addMissingRates()
			while (!await screens.confirm(23, 20, 'Please Confirm')) {
				if (await screens.confirm(2, 2, 'Issue Price Must be Greater than Zero')) return false
				await screens.enter()
			}
			await screens.pleaseConfirm('Y')
			await updateExistingRates()
			await screens.enter()

			if (await screens.waitForScreen('FIG102M2', 'FIG103M1', 'FIG103M3', 'FIG102M2', 'FIG103M4', 'FIG103M4')) {
				await screens.pleaseConfirm('Y')
				if (!await screens.gotoFmsScreen('FMFVRM', 'FIS051M1')) return false

				await screens.typeAndEnter(5, 15, investmentGroup.padStart(4, ' '))
				if (!await screens.waitForScreen('FIG102M2', 'FIG103M3', 'FIG102M2', 'FIG103M4', 'FIG103M4')) return false

				row = await getFundValuationRatesMaintenanceRow(fundValDate, 'Verified')
				if (row > 0) return true

				row = await getFundValuationRatesMaintenanceRow(fundValDate, 'Input')
				if (row > 0) return processFMFVRMverify(row, fundValDate)

				return false
			}

			return false
		}

		await screens.typeAndEnter(10, 2, 'C')
		if (!await screens.waitForScreen('FIG102M2', 'FIG103M1', 'FIG103M3', 'FIG102M2', 'FIG103M4', 'FIG103M4')) return false

		if (await screens.confirm(1, 2, 'Invalid selection')) return false
		await enterFMFVRMeffectiveDate(fundValDate)
		await enterFMFVRMspecialRateFlag(fundValDate)
		await screens.enter()

		if (!await screens.waitForScreen('FIG102M2', 'FIG103M1', 'FIG103M3', 'FIG102M2', 'FIG103M4', 'FIG103M4')) return false

		await screens.pleaseConfirm('Y')
		if (!await screens.gotoFmsScreen('FMFVRM', 'FIS051M1')) return false

		await screens.typeAndEnter(5, 15, investmentGroup.padStart(4, ' '))
		if (!await screens.waitForScreen('FIG102M2', 'FIG103M3', 'FIG102M2', 'FIG103M4', 'FIG103M4')) return false

		row = await getFundValuationRatesMaintenanceRow(fundValDate, 'Verified')
		return row > 0
	}

	if (await screens.waitForScreen('FIB053M1')) {
		const row = await getCFFundValuationRatesMaintenanceRow(fundValDate)
		if (row <= 0) return false

		await screens.typeAndEnter(row, 2, 'S')
		if (await screens.waitForScreen('FIB102M6')) {
			let statusRow = await getFundValuationRatesMaintenanceRow(fundValDate, 'Verified', 'Completed')
			if (statusRow > 0) return true

			statusRow = await getFundValuationRatesMaintenanceRow(fundValDate, 'Completed')
			if (statusRow > 0) return false

			statusRow = await getFundValuationRatesMaintenanceRow(fundValDate, 'Inputed')
			if (statusRow > 0) return verifyFundValuationRatesMaintenanceRow(statusRow)

			if (await screens.getScreenTextTrimmed(10, 4, 10) === '') return false

			await screens.typeAndEnter(10, 2, 'A')
			if (await screens.waitForScreen('FIB103M9')) {
				if (await screens.confirm(8, 2, 'Effective Date')) await screens.typeDate(8, 21, 26, 31, fundValDate)
				if (await screens.confirm(11, 2, 'Cash Management Trust')) {
					if (await screens.confirm(13, 2, 'Interest Rate')) await screens.type(13, 21, '1')
					if (await screens.confirm(14, 2, 'Mgmt Fee Price')) await screens.type(14, 21, '1')
				}
				while (!await screens.confirm(23, 20, 'Please Confirm')) {
					await screens.enter()
					if (await screens.confirm(1, 2, 'Interest rate is not allowed for Coporate fund products')) await screens.clearScreenText(13, 21, 8)
				}
				while (await screens.confirm(23, 20, 'Please Confirm')) await screens.pleaseConfirm('Y')

				if (!await screens.waitForScreen('FIB102M6')) return false

				statusRow = await getFundValuationRatesMaintenanceRow(fundValDate)
				if (statusRow === 0) return false

				if (await screens.confirm(statusRow, 51, 'Completed') || await screens.confirm(statusRow, 51, 'Verified')) return true
				if (await screens.confirm(statusRow, 51, 'Inputed')) {
					await screens.typeAndEnter(statusRow, 2, 'V')
					if (!await screens.waitForScreen('FIB103M9')) return false

					while (!await screens.confirm(23, 20, 'Please Confirm')) {
						await screens.enter()
						if (await screens.confirm(1, 2, 'Mgmt Fee Price not the same as input 1')) {
							if (!await screens.isProtected(14, 21, 11)) await screens.type(14, 21, '1'.padEnd(11, ' '))
						}
					}
					await screens.pleaseConfirm('Y')
					return screens.waitForScreen('FIB102M6')
				}
				return false
			}

			if (await screens.waitForScreen('FIB102M6')) {
				if (!await screens.confirm(1, 2, 'Last date unprocessed')) return false
				if (!await screens.confirm(10, 51, 'Inputed')) return false

				await screens.typeAndEnter(10, 2, 'V')
				if (!await screens.waitForScreen('FIB103M9')) return false

				while (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
				await screens.pleaseConfirm('Y')
				return screens.confirm(10, 51, 'Verified')
			}

			return false
		}

		await screens.typeAndEnter(9, 2, 'S')
		if (!await screens.waitForScreen('FIB102M6')) return false

		let statusRow = await getFundValuationRatesMaintenanceRow(fundValDate)
		if (statusRow === 0) {
			await screens.typeAndEnter(10, 2, 'A')
			if (!await screens.waitForScreen('FIB103M9')) return false

			await screens.typeDate(8, 21, 26, 31, fundValDate)
			if (await screens.confirm(13, 2, 'Interest Rate')) await screens.type(13, 21, '1'.padEnd(8, ' '))
			if (await screens.confirm(14, 2, 'Mgmt Fee Price')) await screens.type(14, 21, '2'.padEnd(11, ' '))
			await screens.setAction('ENTER')
			if (await screens.confirm(1, 2, 'Interest rate is not allowed for Coporate fund products')) {
				await screens.typeAndEnter(13, 21, '0'.padEnd(8, ' '))
			}

			if (!await screens.confirm(23, 20, 'Please Confirm')) return false

			await screens.pleaseConfirm('Y')
			statusRow = await getFundValuationRatesMaintenanceRow(fundValDate)
			if (statusRow === 0) return false

			if (!await screens.confirm(statusRow, 51, 'Inputed')) return false

			await screens.typeAndEnter(statusRow, 2, 'V')
			if (!await screens.waitForScreen('FIB103M9')) return false

			if (!await screens.confirm(13, 2, 'Interest Rate')) return false
			await screens.type(13, 21, '1'.padEnd(8, ' '))
			if (!await screens.confirm(14, 2, 'Mgmt Fee Price')) return false
			await screens.type(14, 21, '2'.padEnd(11, ' '))
			await screens.setAction('ENTER')
			if (!await screens.confirm(23, 20, 'Please Confirm')) return false
			await screens.pleaseConfirm('Y')

			if (!await screens.waitForScreen('FIB102M6')) return false

			statusRow = await getFundValuationRatesMaintenanceRow(fundValDate)
			if (statusRow > 0) return screens.confirm(statusRow, 51, 'Verified')
			return false
		}

		if (await screens.confirm(statusRow, 51, 'Inputed')) {
			await screens.typeAndEnter(statusRow, 2, 'V')
			await screens.waitForScreen('FIB103M9')
			while (!await screens.confirm(23, 20, 'Please Confirm')) {
				await screens.setAction('ENTER')
				if (await screens.confirm(1, 2, 'Mgmt Fee Price not the same as input 2')) await screens.typeAndEnter(14, 21, '2'.padEnd(11, ' '))
			}
			await screens.pleaseConfirm('Y')
			await screens.waitForScreen('FIB102M6')
			return screens.confirm(statusRow, 51, 'Verified')
		}

		return screens.confirm(statusRow, 51, 'Verified')
	}

	return false
}

type InvestmentGroupTuple = [string, string, string]

async function getListOfInvestmentGroups(): Promise<InvestmentGroupTuple[]> {
	return []
}

async function processFMDRIM(_list: InvestmentGroupTuple[]): Promise<boolean> {
	return false
}

export async function processFMPFV(): Promise<boolean> {
	if (await isJobAlreadySuccessful('FMPFV')) return true
	if (!await screens.gotoFmsScreen('FMPFV', 'FIS461M1')) return false

	let successful = false
	while (!successful) {
		await typeReportDestination(16, 2, 22, 'Report Destination')
		if (await screens.confirm(10, 2, 'Product Family')) await screens.typeAndEnter(10, 22, 'A')

		if (await screens.confirm(2, 2, 'Please PF10 to check product errors before you continue')) {
			await screens.setAction('PF10')
			const list = await getListOfInvestmentGroups()
			if (list.length === 0) return false

			if (!await processFMDRIM(list)) return false
			if (!await screens.gotoFmsScreen('FMPFV', 'FIS461M1')) return false
		} else {
			successful = true
		}
	}

	if (!await screens.waitForScreen('FIS461M2')) return false

	await screens.setAction('ENTER')
	const dateTimeNow = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMPFV has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), dateTimeNow)
	}

	return false
}

async function getListOfReferences(_investmentGroup: string, _value: string): Promise<string[]> {
	return []
}

async function processAccountPurchaseWithBanking(_value: string, _reference: string): Promise<void> {
}

export async function processFMFV(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMFV', 'FIS460M1')) return false

	if (await screens.confirm(8, 14, 'Invalid Printer ID')) await screens.typeAndEnter(12, 14, 'S')
	if (!await screens.confirm(9, 2, 'Investment Group')) return false

	await typeReportDestination(13, 2, 22, 'Report Destination')
	await screens.typeAndEnter(9, 22, investmentGroup.padEnd(4, ' '))

	while (true) {
		if (await screens.isProgramName('FIS310M1', 'FIN336M1', 'FIS301M1')) {
			await screens.gotoFmsScreen('FMFV', 'FIS460M1')
			if (await screens.confirm(8, 14, 'Invalid Printer ID')) await screens.typeAndEnter(12, 14, 'S')
			if (await screens.confirm(9, 2, 'Investment Group')) {
				await typeReportDestination(13, 2, 22, 'Report Destination')
				await screens.typeAndEnter(9, 22, investmentGroup.padEnd(4, ' '))
			}
		}

		if (!await screens.isProgramName('FIN460M1', 'FIS460M1', 'FIA460M1', 'FIB460M1', 'FIS460M2')) return false

		if (await screens.confirm(14, 8, 'Do you still wish to continue to submit this Fund Val')) {
			await screens.typeAndEnter(14, 64, 'Y')
		}
		if (await screens.confirm(1, 2, 'Unverified Address for Customer')) return false
		if (await screens.confirm(1, 2, 'FVAL Has Been Applied')) return false
		if (await screens.confirm(2, 27, 'must be RUN between FVAL')) return false
		if (await screens.confirm(2, 2, 'Unverified Rdm for Acct')) return false
		if (await screens.confirm(1, 2, 'Unverified Address for Account')) return false
		if (await screens.getScreenTextTrimmed(24, 50, 1) !== '') await screens.setAction('PF8')
		if (await screens.confirm(11, 27, 'FirstChoice WS Super is CLOSED')) return false
		if (await screens.confirm(1, 2, 'BPAY processing must be done first')) return false
		if (await screens.confirm(1, 2, 'FVAL has been applied')) return true
		if (await screens.confirm(1, 2, 'End of Year Processing is not completed')) return false
		if (await screens.confirm(2, 2, 'Redemption for Account 2 is not complete')) return false

		if (
			await screens.confirm(1, 2, 'FVAL cannot be run, headline rate not entered for Option')
			|| await screens.confirm(1, 2, 'FVAL cannot be run, headline rate not VERIFIED for Option')
		) {
			const split = (await screens.getScreenTextTrimmed(1, 2, 72)).split(' ')
			if (split[12].length < 8) return false

			const date = `${split[12].substring(6, 8)}/${split[12].substring(4, 6)}/${split[12].substring(0, 4)}`
			const list: InvestmentGroupTuple[] = [[investmentGroup, split[10], date]]

			if (!await processFMDRIM(list)) return false
			if (!await screens.gotoFmsScreen('FMFV', 'FIS460M1')) return false

			await typeReportDestination(13, 2, 22, 'Report Destination')
			await screens.typeAndEnter(9, 22, investmentGroup.padEnd(4, ' '))
		}

		if (await screens.confirm(2, 2, 'End of list')) await screens.setAction('ENTER')
		if (await screens.confirm(11, 49, 'CLOSED')) return false
		if (await screens.isProgramName('FIS460M2') && await screens.getScreenTextTrimmed(24, 50, 1) === '') await screens.setAction('ENTER')
		if (await screens.confirm(2, 2, 'Unver. Applications exist')) return false

		if (await screens.confirm(1, 2, 'Outstanding Applications exist')) {
			const split = (await screens.getScreenText(1, 2, 79)).split(' ')
			const listOfReferences = await getListOfReferences(investmentGroup, split[7])
			for (const reference of listOfReferences) {
				await processAccountPurchaseWithBanking(split[7], reference)
			}
		}

		if (await screens.confirm(2, 2, 'Outstanding Apps exist')) {
			const split = (await screens.getScreenText(2, 2, 79)).split(' ')
			await processAccountPurchaseWithBanking(split[7], split[8])
		}

		if (await screens.confirm(2, 11, 'Pending Adjustments exist')) return false

		if (await screens.confirm(23, 20, 'Please Confirm')) {
			const dateTimeNow = await screens.pleaseConfirm('Y')
			await screens.waitForScreen('FIS460M1')
			if (
				await screens.confirm(2, 31, 'FMFV has been submitted for processing')
				|| await screens.confirm(2, 32, 'FMFV has been submitted for processing')
			) {
				return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, dateTimeNow)
			}
			return false
		}

		if (await screens.confirm(1, 2, 'Rates  Has not Been Verified')) return false
		if (await screens.confirm(1, 2, 'Distribution of') && await screens.confirm(1, 27, 'must be RUN between FVAL')) return false
	}
}

export async function processFMBAL(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMBALAN', 'FMS507M1')) return false

	if (await screens.confirm(12, 9, 'Fix ABOTD')) await screens.type(12, 41, 'Y')
	await typeReportDestination(21, 9, 41, 'Report Destination')
	if (await screens.confirm(6, 9, 'Investment Group')) await screens.typeAndEnter(6, 28, investmentGroup.padStart(4, ' '))
	if (await screens.confirm(8, 14, 'Invalid Printer ID')) await screens.typeAndEnter(12, 14, 'S')

	const dateTimeNow = await screens.pleaseConfirm('Y')
	await screens.waitForScreen('FMS507M1')
	if (await screens.confirm(2, 31, 'FMBALAN has been submitted for processing')) {
		return isRunningJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), investmentGroup, dateTimeNow)
	}

	return false
}

export async function processFMPI(fundValDate: Date, _systemDate: Date): Promise<boolean> {
	if (fundValDate.getDay() === 0 || fundValDate.getDay() === 6) return false

	if (await isJobAlreadySuccessful('FMPI')) return true
	if (!await screens.gotoFmsScreen('FMPI', 'FIS697M1')) return false

	await typeReportDestination(21, 3, 24, 'Report Destination')
	if (await screens.confirm(2, 2, 'FMPI for this company should be run in Cpny - 001')) {
		return screens.confirm(4, 2, '008')
	}

	if (await screens.confirm(8, 3, 'Effective Date')) {
		await screens.typeDate(8, 23, 28, 33, new Date(fundValDate.getTime() + 24 * 60 * 60 * 1000))
	}
	if (await screens.confirm(7, 44, 'NZAUK')) await screens.typeDate(8, 40, 45, 50, fundValDate)

	while (await screens.getScreenTextTrimmed(24, 50, 5) !== '') await screens.setAction('PF8')
	if (!await screens.confirm(23, 20, 'Please Confirm')) await screens.enter()
	if (await screens.confirm(16, 23, 'Pls confirm if OK')) await screens.setAction('ENTER')
	if (await screens.confirm(1, 2, 'Date cannot be earlier than the Last FMPI Date for AUNSW')) return false

	const dateTimeNow = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMPI has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), dateTimeNow)
	}

	return false
}

export async function processFMPRD(investmentGroup: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPRD', 'FMS260M1')) return false

	await typeReportDestination(9, 2, 23, 'Report Destination')
	await screens.typeAndEnter(6, 23, investmentGroup.padStart(4, ' '))
	await screens.type(6, 72, 'Y')
	await screens.type(12, 24, 'Y')
	await screens.type(13, 24, 'Y')
	await screens.type(14, 24, 'Y')
	await screens.type(15, 24, 'Y')
	await screens.type(16, 24, 'Y')
	await screens.type(17, 24, 'Y')
	await screens.type(18, 24, 'Y')
	await screens.type(19, 24, 'Y')
	await screens.type(21, 70, 'Y')
	await screens.type(21, 29, 'Y')
	await screens.type(21, 70, 'Y')
	await screens.type(22, 29, 'Y')
	await screens.enter()

	const timeout = Date.now() + 10 * timeoutSeconds * 1000
	while (Date.now() < timeout && !await screens.confirm(23, 20, 'Please Confirm')) {
		if (await screens.confirm(1, 2, "Please enter 'Y' or 'N'")) {
			const cursor = await screens.getCursorPosition()
			await screens.typeAndEnter(cursor.row, cursor.column, 'Y')
		}
		if (await screens.confirm(1, 2, "Contribution Tax sweep is not required for this product. Please set to 'N'")) await screens.typeAndEnter(18, 24, 'N')
		if (await screens.confirm(1, 2, 'This Product does not support Margin Lending')) await screens.typeAndEnter(19, 24, 'N')
		if (await screens.confirm(1, 2, "'Process Choice Redemptions' cannot be 'Y'")) await screens.typeAndEnter(21, 70, 'N')
		if (await screens.confirm(2, 2, 'No Redemption to DES requested')) await screens.typeAndEnter(6, 72, 'N')
		if (await screens.confirm(1, 2, 'CGT can only be requested for a product family product')) await screens.typeAndEnter(16, 24, 'N')
		if (await screens.confirm(1, 2, 'Adv Trail Rebate and Client Rebate are not eligible to the product')) await screens.typeAndEnter(21, 29, 'N')
		if (await screens.confirm(1, 2, 'Management Fee Rebate does not apply to CF products')) await screens.typeAndEnter(22, 29, 'N')
		if (await screens.confirm(2, 2, 'No Choice Redemption to DES requested')) await screens.typeAndEnter(21, 70, 'N')
		if (await screens.confirm(1, 2, "All Fees already funded for this date. Set to 'N'")) await screens.typeAndEnter(15, 24, 'N')
		if (await screens.confirm(1, 2, "Applications already funded for this date. Set to 'N'")) await screens.typeAndEnter(12, 24, 'N')
		if (await screens.confirm(1, 2, 'Fees cannot be processed')) await screens.typeAndEnter(15, 24, 'N')
		if (await screens.confirm(1, 2, 'Client Rebate DES processing has been run')) await screens.typeAndEnter(21, 29, 'N')
		if (await screens.confirm(1, 2, "Redemptions already funded for this date. Set to 'N'")) await screens.typeAndEnter(13, 24, 'N')
		if (await screens.confirm(1, 2, 'Margin Loan Funding has been processed up to last Fund Valuation')) await screens.typeAndEnter(19, 24, 'N')
		if (await screens.confirm(1, 2, 'Product closed')) return false
		if (await screens.confirm(1, 2, "FundVal DES not required for product. Please set to 'N'")) {
			const cursor = await screens.getCursorPosition()
			await screens.typeAndEnter(cursor.row, cursor.column, 'N')
		}
		if (await screens.confirm(1, 2, "Switches already funded for this date. Set to 'N'")) await screens.typeAndEnter(14, 24, 'N')
		if (await screens.confirm(1, 2, "CGT already funded for this date. Set to 'N'")) await screens.typeAndEnter(16, 24, 'N')
		if (await screens.confirm(1, 2, "Contribution Tax sweep has been processed for this date. Set to 'N'")) await screens.typeAndEnter(18, 24, 'N')
		if (await screens.confirm(1, 2, "Adjustments already funded for this date. Set to 'N'")) await screens.typeAndEnter(17, 24, 'N')
		if (await screens.confirm(2, 2, 'Unverified Redemption')) return false
		if (await screens.confirm(1, 2, "Not an ARC product. All Fund Valuation fields must be 'N'")) {
			const cursor = await screens.getCursorPosition()
			await screens.typeAndEnter(cursor.row, cursor.column, 'N')
		}
		if (await screens.confirm(1, 2, 'Must select at least one job for submission')) return true
	}

	if (!await screens.isPleaseConfirm()) return false

	const dateTimeNow = await screens.pleaseConfirm('Y')
	const status = (await screens.getScreenTextTrimmed(2, 2, 78)).trim()

	if (!status.startsWith('Jobs: ') && !status.startsWith('Job : ')) return false

	let jobNames = status.split(' ').filter((item) => item.toUpperCase().startsWith('FB'))
	if (jobNames.length === 0) {
		jobNames = status.split(' ').filter((item) => item.toUpperCase().startsWith('FM'))
	}

	return isJobCompleted(jobNames, investmentGroup, dateTimeNow)
}

export async function processFMPID(): Promise<boolean> {
	if (await isJobAlreadySuccessful('FMPID')) return true
	if (!await screens.gotoFmsScreen('FMPID', 'FIS272M1')) return false

	await screens.enter()
	if (await screens.confirm(1, 2, 'NO INTERFUND FOUND FOR DES')) return true
	if (!await screens.confirm(23, 20, 'Please Confirm')) return false

	const dateTimeNow = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMPID has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), dateTimeNow)
	}

	return false
}

async function getPendingFVALBankBalancingReportRow(fundValDate: Date): Promise<number> {
	const firstRow = 10
	const lastRow = 18

	for (let row = firstRow; row <= lastRow; row++) {
		const date = await screens.getScreenDate(row, 30, 33, 36)
		if (date.getTime() === fundValDate.getTime()) return row
	}

	return 0
}

export async function processFMPFBBR(investmentGroup: string, fundValDate: Date): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMPFBBR', 'FIG150M1')) return false

	await typeReportDestination(20, 9, 30, 'Report Destination')
	await screens.typeAndEnter(7, 30, investmentGroup.padStart(4, ' '))
	await screens.waitForScreen('FIG150M1')

	const row = await getPendingFVALBankBalancingReportRow(fundValDate)
	if (row > 0) {
		await screens.typeAndEnter(row, 21, 'S')
	} else {
		await screens.typeAndEnter(10, 21, 'A')
	}

	if (!await screens.confirm(23, 20, 'Please Confirm')) return false

	const dateTimeNow = await screens.pleaseConfirm('Y')
	if (await screens.confirm(2, 31, 'FMPFBBR has been submitted for processing')) {
		return isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), dateTimeNow)
	}

	return false
}

export async function processFMITIH(fundValDate: Date): Promise<boolean> {
	if (await isJobAlreadySuccessful('FMITIH')) return true
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
	if (await isJobAlreadySuccessful('FMDIH')) return true
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
	if (await isJobAlreadySuccessful('FMATI')) return true
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
	if (await isJobAlreadySuccessful('FMHAI')) return true
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
	if (await isJobAlreadySuccessful('FMTUE')) return true

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
		if (!await isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)) return false
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

		if (!await isJobCompleted(await screens.getScreenTextTrimmed(2, 8, 8), submittedAt)) return false
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

	for (const jobName of jobNames) {
		if (!await isJobCompleted(jobName, submittedAt)) return false
	}

	return true
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

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function isJobAlreadyCompleted(_jobName: string): Promise<boolean> {
	return false
}

async function isJobAlreadySuccessful(jobName: string): Promise<boolean> {
	if (!await screens.gotoFmsScreen('FMJC', 'FMS945M1')) return false

	await screens.setAction('PF10')
	await screens.waitForScreen('FMS945M1')
	await screens.type(16, 25, jobName.padEnd(8, ' '))
	await screens.typeAndEnter(8, 8, 'S')

	if (await screens.confirm(2, 2, 'No Jobs found belonging to')) return false

	return isJobAlreadyCompleted(jobName)
}

async function isJobCompleted(jobName: string, dateTimeNow: Date): Promise<boolean>
async function isJobCompleted(jobNames: string[], investmentGroup: string, dateTimeNow: Date): Promise<boolean>
async function isJobCompleted(jobNameOrNames: string | string[], investmentGroupOrDateTimeNow: string | Date, dateTimeNow?: Date): Promise<boolean> {
	if (typeof jobNameOrNames === 'string') {
		return isRunningJobCompleted(jobNameOrNames, '', investmentGroupOrDateTimeNow as Date)
	}

	const investmentGroup = investmentGroupOrDateTimeNow as string
	for (const jobName of jobNameOrNames) {
		if (!await isRunningJobCompleted(jobName, investmentGroup, dateTimeNow as Date)) return false
	}

	return true
}

async function findJobRow(_jobName: string, _investmentGroup: string, _dateTime: Date): Promise<number> {
	return 0
}

async function jobCompleted(jobName: string, investmentGroup: string, dateTime: Date): Promise<string> {
	while (await screens.isProgramName('FMS946M2') && await screens.getScreenTextTrimmed(24, 44, 1) !== '') {
		await screens.setAction('PF7')
	}

	const row = await findJobRow(jobName.trim().toUpperCase(), investmentGroup, dateTime)
	if (row > 0) return await screens.getScreenTextTrimmed(row, 25, 11)

	const fallbackRow = await findJobRow(jobName.replace('FM', 'FB').trim().toUpperCase(), investmentGroup, dateTime)
	if (fallbackRow > 0) return await screens.getScreenTextTrimmed(fallbackRow, 25, 11)

	return 'Completed'
}

export async function isRunningJobCompleted(jobName: string, investmentGroup: string, dateTimeNow: Date): Promise<boolean> {
	const timeout = Date.now() + 10 * 60_000

	if (!await screens.gotoFmsScreen('FMJC', 'FMS945M1')) return false

	await screens.setAction('PF10')

	if (dateTimeNow.getTime() !== new Date(1899, 11, 30).getTime()) {
		await screens.typeTime(12, 41, 46, new Date(Date.now() - 60_000))
		await screens.typeTime(13, 41, 46, new Date(Date.now() + 60_000))
	}

	if (!await screens.confirm(16, 25, '       ')) await screens.clearScreenText(16, 25, 8)
	await screens.typeAndEnter(7, 8, 'S')

	let completed = ''
	while (completed === '' || completed === 'Start Run' || completed === 'Submitted') {
		completed = await jobCompleted(jobName, investmentGroup, dateTimeNow)

		if (completed !== 'Completed') {
			if (Date.now() < timeout) {
				await delay(500)
				await screens.enter()
			} else {
				return false
			}
		}
	}

	return completed === 'Completed'
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

export async function processFMDC(environment: string, companyName: string, fundValDate: Date): Promise<boolean> {
	const fileNumber = await getFileNumber(environment, fundValDate)
	if (fileNumber <= 0) {
		await writeToProcessingLog(environment, companyName, fundValDate, 'FMDC not executed because FMDJC says no transactions')
		return true
	}

	if (await isJobAlreadySuccessful('FMDC')) return true
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