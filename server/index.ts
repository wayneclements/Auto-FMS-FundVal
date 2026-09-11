import cors from 'cors'
import express from 'express'
import { checkDatabase, createEditorRow, deleteEditorRow, getEditorData, listCompanies, listFundValTypes, listProcesses, listRunSheets, updateEditorRow, writeToProcessingLog } from './db.ts'

const app = express()
const port = Number(process.env.API_PORT ?? 5174)

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_request, response, next) => {
  try {
    response.json(await checkDatabase())
  } catch (error) {
    next(error)
  }
})

app.post('/api/connect-database', async (_request, response) => {
  try {
    await checkDatabase()
    response.json({ connected: true, message: 'Database connection successful' })
  } catch (error) {
    response.status(500).json({ connected: false, message: error instanceof Error ? error.message : 'Database connection failed' })
  }
})

app.post('/api/connect-fms', async (_request, response) => {
  try {
    // Simulate FMS connection attempt with 10% failure rate
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
    
    const randomValue = Math.random()
    if (randomValue < 0.1) { // 10% chance of failure
      return response.status(500).json({ connected: false, message: 'FMS interface connection failed - simulated failure' })
    }
    
    response.json({ connected: true, message: 'FMS interface connection successful' })
  } catch (error) {
    response.status(500).json({ connected: false, message: error instanceof Error ? error.message : 'FMS connection failed' })
  }
})

app.post('/api/processing-log', async (request, response, next) => {
  const { environment, companyName, fundValDate, message } = request.body as Record<string, unknown>
  if (typeof environment !== 'string' || typeof companyName !== 'string' || typeof fundValDate !== 'string' || typeof message !== 'string') {
    return response.status(400).json({ message: 'A valid processing log entry is required.' })
  }

  const parsedFundValDate = new Date(fundValDate)
  if (Number.isNaN(parsedFundValDate.getTime())) {
    return response.status(400).json({ message: 'Fund Valuation Date must be valid.' })
  }

  try {
    await writeToProcessingLog(environment, companyName, parsedFundValDate, message)
    response.status(201).end()
  } catch (error) {
    next(error)
  }
})

app.get('/api/run-sheets', async (_request, response, next) => {
  try {
    response.json(await listRunSheets())
  } catch (error) {
    next(error)
  }
})

app.get('/api/run-sheets/:runSheetName/companies', async (request, response, next) => {
  try {
    response.json(await listCompanies(request.params.runSheetName))
  } catch (error) {
    next(error)
  }
})

app.get('/api/run-sheets/:runSheetName/companies/:companyName/fund-val-types', async (request, response, next) => {
  try {
    response.json(await listFundValTypes(request.params.runSheetName, request.params.companyName))
  } catch (error) {
    next(error)
  }
})

app.get('/api/run-sheets/:runSheetName/companies/:companyName/fund-val-types/:fundValTypeName/processes', async (request, response, next) => {
  try {
    response.json(await listProcesses(request.params.runSheetName, request.params.companyName, request.params.fundValTypeName))
  } catch (error) {
    next(error)
  }
})

app.get('/api/editor/run-sheets/:runSheetName', async (request, response, next) => {
  try {
    response.json(await getEditorData(request.params.runSheetName))
  } catch (error) {
    next(error)
  }
})

const editorTables = new Set(['companies', 'fund-val-types', 'processes', 'investment-groups'])

app.post('/api/editor/:table', async (request, response, next) => {
  try {
    if (!editorTables.has(request.params.table)) return response.status(404).json({ message: 'Editor table not found' })
    await createEditorRow(request.params.table as Parameters<typeof createEditorRow>[0], request.body)
    response.status(201).end()
  } catch (error) {
    next(error)
  }
})

app.put('/api/editor/:table/:id', async (request, response, next) => {
  try {
    if (!editorTables.has(request.params.table)) return response.status(404).json({ message: 'Editor table not found' })
    await updateEditorRow(request.params.table as Parameters<typeof updateEditorRow>[0], Number(request.params.id), request.body)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.delete('/api/editor/:table/:id', async (request, response, next) => {
  try {
    if (!editorTables.has(request.params.table)) return response.status(404).json({ message: 'Editor table not found' })
    await deleteEditorRow(request.params.table as Parameters<typeof deleteEditorRow>[0], Number(request.params.id))
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unexpected API error'
  response.status(500).json({ message })
})

app.listen(port, () => {
  console.log(`Auto FMS FundVal API listening on http://localhost:${port}`)
})
