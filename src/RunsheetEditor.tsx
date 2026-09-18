import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'

type RunSheet = { id: number, name: string }
type EditorData = {
  companies: Array<{ id: number, company: string }>
  fundValTypes: Array<{ id: number, company: string, fundValType: string }>
  processes: Array<{ id: number, company: string, fundValType: string, process: string }>
  investmentGroups: Array<{ id: number, company: string, fundValType: string, process: string, investmentGroup: string | null }>
}

type EditorTable = 'companies' | 'fund-val-types' | 'processes' | 'investment-groups'

const emptyData: EditorData = { companies: [], fundValTypes: [], processes: [], investmentGroups: [] }

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Editor request failed')
  return response
}

function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>
}

function compareInvestmentGroups(first: string | null, second: string | null) {
  const firstValue = first ?? ''
  const secondValue = second ?? ''
  const firstNumber = Number(firstValue)
  const secondNumber = Number(secondValue)

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) return firstNumber - secondNumber || firstValue.localeCompare(secondValue)
  if (Number.isFinite(firstNumber)) return -1
  if (Number.isFinite(secondNumber)) return 1
  return firstValue.localeCompare(secondValue)
}

type ContextMenuState = {
  x: number
  y: number
  company: string
  fundValType: string
  process: string
  groupId?: number
  groupName?: string | null
} | null

export default function RunsheetEditor({ runSheets, onClose, onCompanyCreated }: { runSheets: RunSheet[], onClose: () => void, onCompanyCreated: (runSheetName: string) => void }) {
  const [runSheetName, setRunSheetName] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedFundValType, setSelectedFundValType] = useState('')
  const [data, setData] = useState<EditorData>(emptyData)
  const [message, setMessage] = useState('Select a run sheet to edit its normalized data.')
  const [busy, setBusy] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)

  async function reload(name = runSheetName) {
    if (!name) {
      setData(emptyData)
      return
    }
    setBusy(true)
    try {
      const response = await request(`/api/editor/run-sheets/${encodeURIComponent(name)}?refresh=${Date.now()}`, { cache: 'no-store' })
      setData(await response.json() as EditorData)
      setMessage('Changes are saved directly to the normalized tables.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load editor data.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void reload() }, [runSheetName])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null
      if (target?.closest('.context-menu')) return
      setContextMenu(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function openGroupContextMenu(event: MouseEvent<HTMLTableCellElement>, item: { company: string, fundValType: string, process: string }, group?: { id: number, investmentGroup: string | null }) {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      company: item.company,
      fundValType: item.fundValType,
      process: item.process,
      groupId: group?.id,
      groupName: group?.investmentGroup ?? null,
    })
  }

  async function addInvestmentGroup() {
    if (!contextMenu) return

    const value = window.prompt('Investment group value', contextMenu.groupName ?? '')
    if (value === null) {
      setContextMenu(null)
      return
    }

    const investmentGroup = value.trim()
    if (!investmentGroup) {
      setContextMenu(null)
      return
    }

    setBusy(true)
    try {
      await request(`/api/editor/investment-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runSheetName,
          company: contextMenu.company,
          fundValType: contextMenu.fundValType,
          process: contextMenu.process,
          investmentGroup,
        }),
      })
      await reload(runSheetName)
      setMessage(`Added investment group ${investmentGroup} to ${contextMenu.process}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add investment group.')
    } finally {
      setBusy(false)
      setContextMenu(null)
    }
  }

  async function create(table: EditorTable, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = formValues(form)
    setBusy(true)
    try {
      await request(`/api/editor/${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, runSheetName }) })
      form.reset()
      await reload(runSheetName)
      if (table === 'companies') onCompanyCreated(runSheetName)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add row.')
    } finally { setBusy(false) }
  }

  async function update(table: EditorTable, id: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await request(`/api/editor/${table}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formValues(event.currentTarget)) })
      await reload(runSheetName)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save row.')
    } finally { setBusy(false) }
  }

  async function remove(table: EditorTable, id: number, label: string) {
    if (!window.confirm(`Delete ${label}? Related child records will also be deleted.`)) return
    setBusy(true)
    try {
      await request(`/api/editor/${table}/${id}`, { method: 'DELETE' })
      await reload(runSheetName)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete row.')
    } finally { setBusy(false) }
  }

  async function deleteGroupFromContextMenu() {
    if (!contextMenu || contextMenu.groupId === undefined) return

    const label = contextMenu.groupName ?? `${contextMenu.process} investment group`
    await remove('investment-groups', contextMenu.groupId, label)
    setContextMenu(null)
  }

  const typeOptions = data.fundValTypes.map((item) => `${item.company}|${item.fundValType}`)
  const processOptions = data.processes.map((item) => `${item.company}|${item.fundValType}|${item.process}`)
  const visibleFundValTypes = selectedCompany
    ? data.fundValTypes.filter((item) => item.company === selectedCompany)
    : []
  const visibleProcesses = selectedCompany && selectedFundValType
    ? data.processes.filter((item) => item.company === selectedCompany && item.fundValType === selectedFundValType)
    : []
  const investmentGroupsByProcess = new Map(visibleProcesses.map((process) => [
    process.process,
    data.investmentGroups
      .filter((group) => group.company === process.company && group.fundValType === process.fundValType && group.process === process.process)
      .sort((first, second) => compareInvestmentGroups(first.investmentGroup, second.investmentGroup)),
  ]))
  const investmentGroupColumnCount = Math.max(0, ...[...investmentGroupsByProcess.values()].map((groups) => groups.length))
  const processHeadingValues = [selectedCompany && `company: ${selectedCompany}`, selectedFundValType].filter(Boolean).join(', ')

  return <main className="editor-stage">
    <section className="editor-window" aria-labelledby="runsheet-editor-heading">
      <header className="editor-header"><div><p>DATA MAINTENANCE</p><h1 id="runsheet-editor-heading">Runsheet Editor</h1></div><button type="button" onClick={onClose}>Close</button></header>
      <div className="editor-toolbar"><label htmlFor="editor-run-sheet">Run sheet</label><select id="editor-run-sheet" value={runSheetName} onChange={(event) => { setRunSheetName(event.target.value); setSelectedCompany(''); setSelectedFundValType('') }}><option value="">Select a run sheet</option>{runSheets.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><button type="button" disabled={!runSheetName || busy} onClick={() => void reload()}>Refresh</button><span role="status">{busy ? 'Refreshing...' : message}</span></div>
      {runSheetName && <div className="editor-sections">
        <section className="editor-section"><h2>Companies</h2><form className="editor-add" onSubmit={(event) => void create('companies', event)}><input name="company" placeholder="Company" required /><button disabled={busy}>Add</button></form><table><thead><tr><th>Company</th><th /></tr></thead><tbody>{data.companies.map((item) => <tr key={item.id}><td><input form={`company-${item.id}`} name="company" defaultValue={item.company} required onFocus={() => { setSelectedCompany(item.company); setSelectedFundValType('') }} /></td><td><form className="editor-actions" id={`company-${item.id}`} onSubmit={(event) => void update('companies', item.id, event)}><button disabled={busy}>Save</button><button type="button" disabled={busy} onClick={() => void remove('companies', item.id, item.company)}>Delete</button></form></td></tr>)}</tbody></table></section>
        <section className="editor-section"><h2>FundVal Types</h2><form className="editor-add" onSubmit={(event) => void create('fund-val-types', event)}><input type="hidden" name="company" value={selectedCompany} /><input name="fundValType" placeholder="FundVal type" required /><button disabled={busy || !selectedCompany}>Add</button></form><table><thead><tr><th>Company</th><th>FundVal type</th><th /></tr></thead><tbody>{visibleFundValTypes.map((item) => <tr key={item.id} onClick={() => setSelectedFundValType(item.fundValType)} aria-selected={selectedFundValType === item.fundValType}><td>{item.company}</td><td><form id={`type-${item.id}`} onSubmit={(event) => void update('fund-val-types', item.id, event)}><input name="fundValType" defaultValue={item.fundValType} required /></form></td><td><button form={`type-${item.id}`} disabled={busy}>Save</button><button type="button" disabled={busy} onClick={() => void remove('fund-val-types', item.id, item.fundValType)}>Delete</button></td></tr>)}</tbody></table></section>
        <section className="editor-section process-matrix">{processHeadingValues && <h2>Processes ({processHeadingValues})</h2>}<form className="editor-add" onSubmit={(event) => void create('processes', event)}><select name="parent" required onChange={(event) => { const [company, fundValType] = event.target.value.split('|'); const form = event.currentTarget.form; if (!form) return; form.querySelector<HTMLInputElement>('[name=company]')!.value = company; form.querySelector<HTMLInputElement>('[name=fundValType]')!.value = fundValType }}><option value="">Company / type</option>{typeOptions.map((item) => <option key={item} value={item}>{item.replace('|', ' / ')}</option>)}</select><input type="hidden" name="company" /><input type="hidden" name="fundValType" /><input name="process" placeholder="Process" required /><button disabled={busy}>Add</button></form><form className="editor-add" onSubmit={(event) => void create('investment-groups', event)}><select name="parent" required onChange={(event) => { const [company, fundValType, process] = event.target.value.split('|'); const form = event.currentTarget.form!; form.querySelector<HTMLInputElement>('[name=company]')!.value = company; form.querySelector<HTMLInputElement>('[name=fundValType]')!.value = fundValType; form.querySelector<HTMLInputElement>('[name=process]')!.value = process }}><option value="">Company / type / process</option>{processOptions.map((item) => <option key={item} value={item}>{item.replaceAll('|', ' / ')}</option>)}</select><input type="hidden" name="company" /><input type="hidden" name="fundValType" /><input type="hidden" name="process" /><input name="investmentGroup" placeholder="Investment group" required /><button disabled={busy}>Add</button></form><table><tbody>{visibleProcesses.map((item) => { const groups = investmentGroupsByProcess.get(item.process) ?? []; return <tr key={item.id}><td className="process-cell"><button type="button" className="process-button">{item.process}</button></td>{Array.from({ length: investmentGroupColumnCount }, (_, index) => { const group = groups[index]; return <td className="investment-group-cell" key={index} onContextMenu={(event) => openGroupContextMenu(event, item, group ?? undefined)}>{group && <form id={`group-${group.id}`} onSubmit={(event) => void update('investment-groups', group.id, event)}><input name="investmentGroup" defaultValue={group.investmentGroup ?? ''} required /></form>}</td>})}<td><button type="button" disabled={busy} onClick={() => void remove('processes', item.id, item.process)}>Delete</button></td></tr>})}</tbody></table>{contextMenu && <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" aria-label="Investment group actions"><button type="button" onClick={() => void addInvestmentGroup()}>Add</button>{contextMenu.groupId !== undefined && <button type="button" onClick={() => void deleteGroupFromContextMenu()}>Delete</button>}</div>}</section>
      </div>}
    </section>
  </main>
}