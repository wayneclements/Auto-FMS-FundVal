export async function writeToProcessingLog(environment: string, companyName: string, fundValDate: Date, message: string): Promise<void> {
	const response = await fetch('/api/processing-log', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			environment,
			companyName,
			fundValDate: fundValDate.toISOString(),
			message,
		}),
	})

	if (!response.ok) throw new Error(await response.text())
}