import { useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'
import tickIcon from './assets/icons/tick.gif'
import crossIcon from './assets/icons/cross.svg'
import RunsheetEditor from './RunsheetEditor'
import { getListOfInvestmentGroupStatus } from './ui/actions'
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
  notes: string | null
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

function formatIsoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

function parseDisplayToIso(display: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(display.trim())
  if (!match) return ''

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function renderRichText(value: string): ReactNode[] {
  return value.split(/(\*\*.*?\*\*)/g).map((part, index) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  ))
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
  const [fundValDate, setFundValDateIso] = useState('')
  const [fundValDateText, setFundValDateText] = useState('')
  const [fmsConnected, setFmsConnected] = useState(false)
  const [databaseConnected, setDatabaseConnected] = useState(false)
  const [status, setStatus] = useState('Loading run sheets')
  const [error, setError] = useState('')
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [showRunsheetEditor, setShowRunsheetEditor] = useState(false)
  const [processes, setProcesses] = useState<Process[]>([])
  const [activeInvestmentGroups, setActiveInvestmentGroups] = useState<string[]>([])
  const [processResults, setProcessResults] = useState<Record<string, boolean>>({})
  const [investmentGroupResults, setInvestmentGroupResults] = useState<Record<string, Record<string, boolean>>>({})
  const [processNotes, setProcessNotes] = useState('')
  const processFormRef = useRef<HTMLElement>(null)

  function setFundValDate(iso: string) {
    setFundValDateIso(iso)
    setFundValDateText(formatIsoToDisplay(iso))
  }

  function handleFundValDateTextChange(value: string) {
    setFundValDateText(value)
    setFundValDateIso(parseDisplayToIso(value))
  }

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
    setActiveInvestmentGroups([])
    setProcessNotes('')
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
      setActiveInvestmentGroups([])
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
    setActiveInvestmentGroups([])
    setProcessNotes('')
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
    setActiveInvestmentGroups([])
    setProcessNotes('')
    setFundValDate(nextFundValDate(nextType))
  }

  function handleNext() {
    setShowProcessForm(true)
  }

  async function handleProcessButtonClick(processName: string, company: string, investmentGroups: processModule.ProcessInvestmentGroup[], fundValDate: Date) {
    setError('')
    try {
      let result: boolean = false;
      switch (processName.toUpperCase()) {
        case "FMSD":
          result = await processModule.processFMSDbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPPFR":
          result = await processModule.processFMPPFRbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPPP":
          result = await processModule.processFMPPPbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPIV":
          result = await processModule.processFMPIVbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMFVRM":
          result = await processModule.processFMFVRMbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPFV":
          result = await processModule.processFMPFVbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMFV":
          result = await processModule.processFMFVbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMBAL":
          result = await processModule.processFMBALbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMBALAN":
          result = await processModule.processFMBALbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPI":
          result = await processModule.processFMPIbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPRD":
          result = await processModule.processFMPRDbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPID":
          result = await processModule.processFMPIDbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPPPD":
          result = await processModule.processFMPPPDbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMDC":
          result = await processModule.processFMDCbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMITIH":
          result = await processModule.processFMITIHbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMDIH":
          result = await processModule.processFMDIHbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMATI":
          result = await processModule.processFMATIbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMHAI":
          result = await processModule.processFMHAIbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMCP":
          result = await processModule.processFMCPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMTUE":
          result = await processModule.processFMTUEbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMDRM":
          result = await processModule.processFMDRMbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMCIA":
          result = await processModule.processFMCIAbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMDP":
          result = await processModule.processFMDPbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMBS":
          result = await processModule.processFMBSbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPRPC":
          result = await processModule.processFMPRPCbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMFCPS":
          result = await processModule.processFMFCPSbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMRBFSR":
          result = await processModule.processFMRBFSRbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPSM":
          result = await processModule.processFMPSMbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPDDD":
          result = await processModule.processFMPDDDbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMAR":
          result = await processModule.processFMARbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMTCFP":
          result = await processModule.processFMTCFPbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPIF":
          result = await processModule.processFMPIFbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPMIP":
          result = await processModule.processFMPMIPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMRBRR":
          result = await processModule.processFMRBRRbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPRBMR":
          result = await processModule.processFMPRBMRbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPDCD":
          result = await processModule.processFMPDCDbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMMFRP":
          result = await processModule.processFMMFRPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMMFA":
          result = await processModule.processFMMFAbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPASF":
          result = await processModule.processFMPASFbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPPD":
          result = await processModule.processFMPPDbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMDIRM":
          result = await processModule.processFMDIRMbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPCP":
          result = await processModule.processFMPCPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPSMREP":
          result = await processModule.processFMPSMREPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPFBBR":
          result = await processModule.processFMPFBBRbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPMIPD":
          result = await processModule.processFMPMIPDbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMSWG":
          result = await processModule.processFMSWGbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMPMFI":
          result = await processModule.processFMPMFIbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMCFP":
          result = await processModule.processFMCFPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMMFD":
          result = await processModule.processFMMFDbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMPDD":
          result = await processModule.processFMPDDbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMAPTP":
          result = await processModule.processFMAPTPbutton(environment, company, investmentGroups, fundValDate, (investmentGroupName, success) => {
            setInvestmentGroupResults((previous) => ({
              ...previous,
              [processName]: { ...previous[processName], [investmentGroupName]: success },
            }))
          });
          break;
        case "FMEOYFG":
          result = await processModule.processFMEOYFGbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMEOYP": result = await processModule.processFMEOYPbutton(environment, company, investmentGroups, fundValDate);
          break;
        case "FMAPEOYP":
          result = await processModule.processFMAPEOYPbutton(environment, company, investmentGroups, fundValDate);
          break;
      }
      if (result) {
        setStatus(`Process completed successfully: ${result}`)
        setProcessResults((previous) => ({ ...previous, [processName]: true }))
      } else {
        setStatus('Process did not return a result')
        setProcessResults((previous) => ({ ...previous, [processName]: false }))
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
    if (!showProcessForm || !runSheetName || !companyName || !fundValTypeName) return

    let current = true

    async function loadProcesses() {
      try {
        const items = await getJson<Process[]>(`/api/run-sheets/${encodeURIComponent(runSheetName)}/companies/${encodeURIComponent(companyName)}/fund-val-types/${encodeURIComponent(fundValTypeName)}/processes`)
        const investmentGroupStatuses = await getListOfInvestmentGroupStatus()
        if (!current) return

        setActiveInvestmentGroups(
          Array.from(investmentGroupStatuses)
            .filter(([, status]) => status)
            .map(([investmentGroup]) => investmentGroup),
        )
        setProcesses(items.map((process) => ({
          ...process,
          investmentGroups: process.investmentGroups
            .filter((investmentGroup) => investmentGroupStatuses.get(investmentGroup.name))
            .map((investmentGroup) => ({
              ...investmentGroup,
              state: investmentGroup.state,
            })),
        })))
      } catch (currentError: unknown) {
        if (!current) return
        setError(currentError instanceof Error ? currentError.message : 'Could not load processes')
      }
    }

    void loadProcesses()

    return () => {
      current = false
    }
  }, [companyName, fundValTypeName, runSheetName, showProcessForm])

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
              <input id="fund-val-date" type="text" placeholder="DD/MM/YYYY" value={fundValDateText} onChange={(event) => handleFundValDateTextChange(event.target.value)} disabled={!selectedType} />
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
          <h2 id="process-details-heading">{fundValTypeName} for {companyName} in {environment} for {new Date(`${fundValDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })} {fundValDateText}</h2>
          <form className="process-form">
            <div
              className="rich-text-box"
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-label="Process notes"
              suppressContentEditableWarning
            >{renderRichText(processNotes)}</div>
            <div
              className="process-button-grid"
              aria-label="Process button array"
              style={{ gridTemplateColumns: `minmax(190px, 3fr) repeat(${activeInvestmentGroups.length}, minmax(0, 1fr))` }}
            >
              {[
                ...processes.slice(0, 20).flatMap((process, row) => (
                  Array.from({ length: activeInvestmentGroups.length + 1 }, (_, column) => {
                    const investmentGroup = column > 0
                      ? process.investmentGroups.find(({ name }) => name === activeInvestmentGroups[column - 1])
                      : undefined
                    const label = column === 0 ? process.name : investmentGroup?.state ? investmentGroup.name : ''
                    const processResult = column === 0
                      ? processResults[process.name]
                      : investmentGroup
                        ? investmentGroupResults[process.name]?.[investmentGroup.name]
                        : undefined
                    const className = [
                      'process-grid-button',
                      investmentGroup?.state ? 'active-investment-group' : column > 0 ? 'empty-investment-group' : '',
                      processResult === true ? 'process-result-success' : processResult === false ? 'process-result-failure' : '',
                    ].filter(Boolean).join(' ')

                    return (
                      <button
                        type="button"
                        key={`${row}-${column}`}
                        className={className}
                        title={column === 0 ? process.description : undefined}
                        disabled={!label || (column === 0 && !fundValDate)}
                        onMouseEnter={column === 0 ? () => setProcessNotes(process.notes ?? '') : undefined}
                        onClick={column === 0 ? () => void handleProcessButtonClick(process.name, companyName, process.investmentGroups, new Date(fundValDate)) : undefined}
                      >
                        {label ?? ''}
                      </button>
                    )
                  })
                )),
              ]}
            </div>
          </form>
        </section>
      )}
    </main>
  )
}

export default App
