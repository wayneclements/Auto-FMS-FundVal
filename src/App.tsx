import { useEffect, useRef, useState } from 'react'
import './App.css'
import tickIcon from './assets/icons/tick.gif'
import crossIcon from './assets/icons/cross.svg'
import RunsheetEditor from './RunsheetEditor'
import * as processModule from './ui/process'

type Environment = 'UAT1' | 'UAT2' | 'PROD'

type RunSheet = {
  id: number
  name: string
}

type Company = {
  companyName: string
  companyNumber: string
}

type FundValType = {
  fundValType: string
  lastFundValDate?: string
  lastTotalUnitsExtractRunDate?: string
  openInvestmentGroups: number[]
}

type Process = {
  name: string
  description: string
  investmentGroups: Array<{
    name: string
    state: boolean
  }>
}

const environments: Environment[] = ['UAT1', 'UAT2', 'PROD']

function inferEnvironment(runSheetName: string): Environment | '' {
  if (runSheetName.includes('Test 1')) return 'UAT1'
  if (runSheetName.includes('Test 2')) return 'UAT2'
  return ''
}

function nextFundValDate(type?: FundValType) {
  if (!type?.lastFundValDate || !type.lastTotalUnitsExtractRunDate) return ''

  const lastFundValDate = new Date(type.lastFundValDate)
  const totalUnitsDate = new Date(type.lastTotalUnitsExtractRunDate)
  const nextDate = lastFundValDate <= totalUnitsDate
    ? new Date(lastFundValDate.getTime() + 24 * 60 * 60 * 1000)
    : lastFundValDate

  return nextDate.toISOString().slice(0, 10)
}

function readOnlyReason(type: FundValType | undefined, selectedDate: string) {
  if (!type || !selectedDate) return 'Selections are incomplete.'
  if (!type.lastFundValDate || !type.lastTotalUnitsExtractRunDate) return ''

  const selected = new Date(selectedDate)
  const lastFundValDate = new Date(type.lastFundValDate)
  const totalUnitsDate = new Date(type.lastTotalUnitsExtractRunDate)

  if (selected <= totalUnitsDate) {
    return 'FundVal Date is before the last FMTUE run date, so only read access is permitted.'
  }

  if (selected > lastFundValDate && lastFundValDate > totalUnitsDate) {
    return `Last Fund Val for ${lastFundValDate.toLocaleDateString()} is not finished.`
  }

  return ''
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<T>
}

function App() {
  const [runSheets, setRunSheets] = useState<RunSheet[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [fundValTypes, setFundValTypes] = useState<FundValType[]>([])
  const [runSheetName, setRunSheetName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [fundValTypeName, setFundValTypeName] = useState('')
  const [environment, setEnvironment] = useState<Environment | ''>('')
  const [fundValDate, setFundValDate] = useState('')
  const [fmsConnected, setFmsConnected] = useState(false)
  const [databaseConnected, setDatabaseConnected] = useState(false)
  const [status, setStatus] = useState('Loading run sheets')
  const [error, setError] = useState('')
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [showRunsheetEditor, setShowRunsheetEditor] = useState(false)
  const [processes, setProcesses] = useState<Process[]>([])
  const processFormRef = useRef<HTMLElement>(null)

  const selectedType = fundValTypes.find((type) => type.fundValType === fundValTypeName)
  const readOnlyMessage = readOnlyReason(selectedType, fundValDate)
  const visibleMessage = error || (readOnlyMessage !== 'Selections are incomplete.' ? readOnlyMessage : '')
  const canProcess = Boolean(fmsConnected && databaseConnected && runSheetName && companyName && fundValTypeName && environment && fundValDate)

  function handleRunSheetChange(value: string) {
    setError('')
    setRunSheetName(value)
    setEnvironment(inferEnvironment(value))
    setCompanies([])
    setFundValTypes([])
    setProcesses([])
    setCompanyName('')
    setFundValTypeName('')
    setFundValDate('')
    setStatus(value ? 'Identifying companies in the run sheet' : 'Select the Fund Valuation run sheet')
  }

  async function loadRunSheets() {
    try {
      const items = await getJson<RunSheet[]>('/api/run-sheets')
      setRunSheets(items)
      setRunSheetName('')
      setCompanies([])
      setFundValTypes([])
      setCompanyName('')
      setFundValTypeName('')
      setFundValDate('')
      setEnvironment('')
      setStatus(items.length > 0 ? 'Select the Fund Valuation run sheet' : 'No run sheets found')
      return items
    } catch (currentError: unknown) {
      setError(currentError instanceof Error ? currentError.message : 'Could not load run sheets')
      setStatus('Could not load run sheets')
      return []
    }
  }

  async function handleConnectDatabase() {
    try {
      const response = await fetch('/api/connect-database', { method: 'POST' })
      const data = await response.json() as { connected?: boolean; message?: string }

      if (data.connected) {
        setDatabaseConnected(true)
        setStatus('Database connected successfully')
        await loadRunSheets()
      } else {
        setDatabaseConnected(false)
        setError(data.message || 'Failed to connect to database')
      }
    } catch (currentError: unknown) {
      setDatabaseConnected(false)
      setError(currentError instanceof Error ? currentError.message : 'Database connection failed')
    }
  }

  async function handleConnectFms() {
    try {
      const response = await fetch('/api/connect-fms', { method: 'POST' })
      const data = await response.json() as { connected?: boolean; message?: string }

      if (data.connected) {
        setFmsConnected(true)
        setStatus('FMS interface connected successfully')
      } else {
        setFmsConnected(false)
        setError(data.message || 'Failed to connect to FMS interface')
      }
    } catch (currentError: unknown) {
      setFmsConnected(false)
      setError(currentError instanceof Error ? currentError.message : 'FMS connection failed')
    }
  }

  function handleCompanyChange(value: string) {
    setError('')
    setCompanyName(value)
    setFundValTypes([])
    setProcesses([])
    setFundValTypeName('')
    setFundValDate('')
    setStatus(value ? 'Identifying FundVal types' : 'Select the company')
  }

  function handleCompanyCreated(editorRunSheetName: string) {
    if (editorRunSheetName !== runSheetName) return

    getJson<Company[]>(`/api/run-sheets/${encodeURIComponent(editorRunSheetName)}/companies`)
      .then((items) => {
        setCompanies(items)
        setCompanyName('')
        setFundValTypes([])
        setFundValTypeName('')
        setFundValDate('')
        setStatus('Select the company')
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : 'Could not load companies')
      })
  }

  function handleEnvironmentChange(value: Environment) {
    setError('')
    setEnvironment(value)

    if (!value || !runSheetName || !databaseConnected) {
      setCompanies([])
      setCompanyName('')
      setFundValTypes([])
      setFundValTypeName('')
      setFundValDate('')
      return
    }

    fetch(`/api/run-sheets/${encodeURIComponent(runSheetName)}/companies`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text())
        return response.json() as Promise<Company[]>
      })
      .then((items) => {
        setCompanies(items)
        setCompanyName('')
        setFundValTypes([])
        setFundValTypeName('')
        setFundValDate('')
        setStatus(items.length > 0 ? 'Select the company' : 'No companies found')
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : 'Could not load companies')
        setCompanies([])
        setCompanyName('')
      })
  }

  function handleFundValTypeChange(value: string) {
    const nextType = fundValTypes.find((type) => type.fundValType === value)
    setFundValTypeName(value)
    setProcesses([])
    setFundValDate(nextFundValDate(nextType))
  }

  function handleNext() {
    setShowProcessForm(true)
  }

  async function handleProcessButtonClick(processName: string, company: string, investmentGroups: processModule.ProcessInvestmentGroup[], fundValDate: Date) 
  {
    setError('')
    try {
      switch (processName.toUpperCase()) {
        case "FMSD": return processModule.processFMSDbutton(environment, company, investmentGroups, fundValDate);
        case "FMPPFR": return processModule.processFMPPFRbutton(environment, company, investmentGroups, fundValDate);
        case "FMPPP": return processModule.processFMPPPbutton(environment, company, investmentGroups, fundValDate);
        case "FMPIV": return processModule.processFMPIVbutton(environment, company, investmentGroups, fundValDate);
        case "FMFVRM": return processModule.processFMFVRMbutton(environment, company, investmentGroups, fundValDate);
        case "FMPFV": return processModule.processFMPFVbutton(environment, company, investmentGroups, fundValDate);
        case "FMFV": return processModule.processFMFVbutton(environment, company, investmentGroups, fundValDate);
        case "FMBAL": return processModule.processFMBALbutton(environment, company, investmentGroups, fundValDate);
        case "FMBALAN": return processModule.processFMBALbutton(environment, company, investmentGroups, fundValDate);
        case "FMPI": return processModule.processFMPIbutton(environment, company, investmentGroups, fundValDate);
        case "FMPRD": return processModule.processFMPRDbutton(environment, company, investmentGroups, fundValDate);
        case "FMPID": return processModule.processFMPIDbutton(environment, company, investmentGroups, fundValDate);
        case "FMPPPD": return processModule.processFMPPPDbutton(environment, company, investmentGroups, fundValDate);
        case "FMDC": return processModule.processFMDCbutton(environment, company, investmentGroups, fundValDate);
        case "FMITIH": return processModule.processFMITIHbutton(environment, company, investmentGroups, fundValDate);
        case "FMDIH": return processModule.processFMDIHbutton(environment, company, investmentGroups, fundValDate);
        case "FMATI": return processModule.processFMATIbutton(environment, company, investmentGroups, fundValDate);
        case "FMHAI": return processModule.processFMHAIbutton(environment, company, investmentGroups, fundValDate);
        case "FMCP": return processModule.processFMCPbutton(environment, company, investmentGroups, fundValDate);
        case "FMTUE": return processModule.processFMTUEbutton(environment, company, investmentGroups, fundValDate);
        case "FMDRM": return processModule.processFMDRMbutton(environment, company, investmentGroups, fundValDate);
        case "FMCIA": return processModule.processFMCIAbutton(environment, company, investmentGroups, fundValDate);
        case "FMDP": return processModule.processFMDPbutton(environment, company, investmentGroups, fundValDate);
        case "FMBS": return processModule.processFMBSbutton(environment, company, investmentGroups, fundValDate);
        case "FMPRPC": return processModule.processFMPRPCbutton(environment, company, investmentGroups, fundValDate);
        case "FMFCPS": return processModule.processFMFCPSbutton(environment, company, investmentGroups, fundValDate);
        case "FMRBFSR": return processModule.processFMRBFSRbutton(environment, company, investmentGroups, fundValDate);
        case "FMPSM": return processModule.processFMPSMbutton(environment, company, investmentGroups, fundValDate);
        case "FMPDDD": return processModule.processFMPDDDbutton(environment, company, investmentGroups, fundValDate);
        case "FMAR": return processModule.processFMARbutton(environment, company, investmentGroups, fundValDate);
        case "FMTCFP": return processModule.processFMTCFPbutton(environment, company, investmentGroups, fundValDate);
        case "FMPIF": return processModule.processFMPIFbutton(environment, company, investmentGroups, fundValDate);
        case "FMPMIP": return processModule.processFMPMIPbutton(environment, company, investmentGroups, fundValDate);
        case "FMRBRR": return processModule.processFMRBRRbutton(environment, company, investmentGroups, fundValDate);
        case "FMPRBMR": return processModule.processFMPRBMRbutton(environment, company, investmentGroups, fundValDate);
        case "FMPDCD": return processModule.processFMPDCDbutton(environment, company, investmentGroups, fundValDate);
        case "FMMFRP": return processModule.processFMMFRPbutton(environment, company, investmentGroups, fundValDate);
        case "FMMFA": return processModule.processFMMFAbutton(environment, company, investmentGroups, fundValDate);
        case "FMPASF": return processModule.processFMPASFbutton(environment, company, investmentGroups, fundValDate);
        case "FMPPD": return processModule.processFMPPDbutton(environment, company, investmentGroups, fundValDate);
        case "FMDIRM": return processModule.processFMDIRMbutton(environment, company, investmentGroups, fundValDate);
        case "FMPCP": return processModule.processFMPCPbutton(environment, company, investmentGroups, fundValDate);
        case "FMPSMREP": return processModule.processFMPSMREPbutton(environment, company, investmentGroups, fundValDate);
        case "FMPFBBR": return processModule.processFMPFBBRbutton(environment, company, investmentGroups, fundValDate);
        case "FMPMIPD": return processModule.processFMPMIPDbutton(environment, company, investmentGroups, fundValDate);
        case "FMSWG": return processModule.processFMSWGbutton(environment, company, investmentGroups, fundValDate);
        case "FMPMFI": return processModule.processFMPMFIbutton(environment, company, investmentGroups, fundValDate);
        case "FMCFP": return processModule.processFMCFPbutton(environment, company, investmentGroups, fundValDate);
        case "FMMFD": return processModule.processFMMFDbutton(environment, company, investmentGroups, fundValDate);
        case "FMPDD": return processModule.processFMPDDbutton(environment, company, investmentGroups, fundValDate);
        case "FMAPTP": return processModule.processFMAPTPbutton(environment, company, investmentGroups, fundValDate);
        case "FMEOYFG": return processModule.processFMEOYFGbutton(environment, company, investmentGroups, fundValDate);
        case "FMEOYP": return processModule.processFMEOYPbutton(environment, company, investmentGroups, fundValDate);
        case "FMAPEOYP": return processModule.processFMAPEOYPbutton(environment, company, investmentGroups, fundValDate);
      }
    } catch (currentError: unknown) {
      setError(currentError instanceof Error ? currentError.message : `Could not run ${processName}.`)
    }
  }

  useEffect(() => {
    void loadRunSheets()
  }, [])

  useEffect(() => {
    if (!runSheetName || environment) return

    getJson<Company[]>(`/api/run-sheets/${encodeURIComponent(runSheetName)}/companies`)
      .then((items) => {
        setCompanies(items)
        setStatus(items.length > 0 ? 'Select the company' : 'No companies found')
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : 'Could not load companies')
      })
  }, [environment, runSheetName])

  useEffect(() => {
    if (!runSheetName || !companyName) return

    let current = true

    getJson<FundValType[]>(`/api/run-sheets/${encodeURIComponent(runSheetName)}/companies/${encodeURIComponent(companyName)}/fund-val-types`)
      .then((items) => {
        if (!current) return
        setFundValTypes(items)

        if (items.length > 0) {
          const firstType = items[0]
          setFundValTypeName(firstType.fundValType)
          setFundValDate(nextFundValDate(firstType))
          setStatus('Select the Fund Valuation type')
        } else {
          setFundValTypeName('')
          setFundValDate('')
          setStatus('No FundVal types found')
        }
      })
      .catch((currentError: unknown) => {
        if (!current) return
        setError(currentError instanceof Error ? currentError.message : 'Could not load FundVal types')
      })

    return () => {
      current = false
    }
  }, [companyName, runSheetName])

  useEffect(() => {
    if (showProcessForm) {
      processFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showProcessForm])

  useEffect(() => {
    if (!runSheetName || !companyName || !fundValTypeName) return

    let current = true

    getJson<Process[]>(`/api/run-sheets/${encodeURIComponent(runSheetName)}/companies/${encodeURIComponent(companyName)}/fund-val-types/${encodeURIComponent(fundValTypeName)}/processes`)
      .then((items) => {
        if (current) setProcesses(items)
      })
      .catch((currentError: unknown) => {
        if (!current) return
        setError(currentError instanceof Error ? currentError.message : 'Could not load processes')
      })

    return () => {
      current = false
    }
  }, [companyName, fundValTypeName, runSheetName])

  if (showRunsheetEditor) {
    return <RunsheetEditor runSheets={runSheets} onClose={() => setShowRunsheetEditor(false)} onCompanyCreated={handleCompanyCreated} />
  }

  return (
    <main className="desktop-stage">
      {!showProcessForm && (
        <section className="legacy-window" aria-label="Actual FundVal automation database">
          <header className="title-bar">
            <span className="app-icon" aria-hidden="true" />
            <span>Actual FundVal automation database</span>
            <button type="button" className="editor-launch" onClick={() => setShowRunsheetEditor(true)}>Runsheet Editor</button>
            <div className="window-controls" aria-hidden="true">
              <span>−</span>
              <span>□</span>
              <span>×</span>
            </div>
          </header>

          <form className="legacy-form">
            <div className="form-row connect-row">
              <label>Connect to the FMS interface</label>
              <button type="button" className="tiny-button" onClick={handleConnectFms}>...</button>
              <span className="check-mark" aria-label={fmsConnected ? 'Connected' : 'Not connected'}>
                {fmsConnected ? <img src={tickIcon} alt="connected" style={{ height: '21px', width: '21px' }} /> : <img src={crossIcon} alt="not connected" style={{ height: '21px', width: '21px' }} />}
              </span>
            </div>

            <div className="form-row connect-row">
              <label>Connect to the Postgres database</label>
              <button type="button" className="tiny-button" onClick={handleConnectDatabase}>...</button>
              <span className="check-mark" aria-label={databaseConnected ? 'Connected' : 'Not connected'}>
                {databaseConnected ? <img src={tickIcon} alt="connected" style={{ height: '21px', width: '21px' }} /> : <img src={crossIcon} alt="not connected" style={{ height: '21px', width: '21px' }} />}
              </span>
            </div>

            <div className="form-row run-sheet-row">
              <label htmlFor="run-sheet">Select Fund Valuation Run Sheets</label>
              <select id="run-sheet" value={runSheetName} onChange={(event) => handleRunSheetChange(event.target.value)}>
                <option value="">Select the Fund Valuation Run Sheet</option>
                {runSheets.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <span className="help-mark" title={status}>?</span>
            </div>

            <div className="form-row compact-row">
              <label htmlFor="environment">Select the environment</label>
              <select id="environment" value={environment} onChange={(event) => handleEnvironmentChange(event.target.value as Environment)} disabled={!runSheetName || runSheetName.includes('Test')}>
                <option value=""></option>
                {environments.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div className="form-row company-row">
              <label htmlFor="company">Select the Company</label>
              <select id="company" value={companyName} onChange={(event) => handleCompanyChange(event.target.value)} disabled={!runSheetName}>
                <option value=""></option>
                {companies.map((item) => <option key={item.companyName} value={item.companyName}>{item.companyName}</option>)}
              </select>
            </div>

            <div className="form-row date-row">
              <label htmlFor="fund-val-date">Fund Valuation Date</label>
              <input id="fund-val-date" type="text" value={fundValDate} onChange={(event) => setFundValDate(event.target.value)} disabled={!selectedType} />
              <button type="button" className="tiny-button" disabled={!selectedType}>...</button>
              <input type="text" value={fundValDate ? new Date(fundValDate).toLocaleDateString(undefined, { weekday: 'long' }) : ''} readOnly disabled />
            </div>

            <div className="form-row type-row">
              <label htmlFor="fund-val-type">Select the FundVal type</label>
              <select id="fund-val-type" value={fundValTypeName} onChange={(event) => handleFundValTypeChange(event.target.value)} disabled={!companyName}>
                <option value=""></option>
                {fundValTypes.map((item) => <option key={item.fundValType} value={item.fundValType}>{item.fundValType}</option>)}
              </select>
            </div>

            <div className="button-strip">
              <button type="button" disabled={!canProcess}>EXCEL to RUNSHEET</button>
              <button type="button" disabled={!canProcess}>RUNSHEET to EXCEL</button>
              <button type="button" disabled={!canProcess}>ANALYSE FMJC</button>
              <button type="button" className="quit-button">QUIT</button>
              <button type="button" className={canProcess ? 'next-button-ready' : ''} disabled={!canProcess} onClick={handleNext}>NEXT</button>
            </div>

            {visibleMessage && (
              <div className="message-line" title={visibleMessage}>{visibleMessage}</div>
            )}
          </form>

          <footer className="copyright">© 2021 Colonial First State</footer>
        </section>
      )}

      {showProcessForm && (
        <section ref={processFormRef} className="process-window" aria-labelledby="process-details-heading">
          <h2 id="process-details-heading">Process Details</h2>
          <form className="process-form">
            <div
              className="rich-text-box"
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-label="Process notes"
              suppressContentEditableWarning
            />
            <div className="process-button-grid" aria-label="Process button array">
              {processes.slice(0, 20).flatMap((process, row) => (
                Array.from({ length: 10 }, (_, column) => {
                  const investmentGroup = column > 0 ? process.investmentGroups[column - 1] : undefined
                  const label = column === 0 ? process.name : investmentGroup?.name
                  const className = investmentGroup?.state
                    ? 'process-grid-button active-investment-group'
                    : column > 0
                      ? 'process-grid-button hidden-investment-group'
                      : 'process-grid-button'

                  const company = '';
                  
                  return (
                    <button
                      type="button"
                      key={`${row}-${column}`}
                      className={className}
                      title={column === 0 ? process.description : undefined}
                      disabled={!label || (column === 0 && !fundValDate)}
                      onClick={column === 0 ? () => void handleProcessButtonClick(process.name, company, process.investmentGroups, fundValDate) : undefined}
                    >
                      {label ?? ''}
                    </button>
                  )
                })
              ))}
            </div>
          </form>
        </section>
      )}
    </main>
  )
}

export default App


