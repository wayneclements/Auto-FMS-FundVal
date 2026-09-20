import { processFMDIH, processFMITIH, processFMPPFR, processFMPPP, processFMPPPD, processFMPIV, processFMFVRM, processFMPFV, processFMFV, processFMBAL, processFMPI, processFMPRD, processFMPID, processFMPFBBR, processFMATI, processFMAR, processFMAPTP, processFMBS, processFMCP, processFMDC, processFMDP, processFMDIRM, processFMDRM, processFMCIA, processFMFCPS, processFMHAI, processFMPRPC, processFMRBFSR, processFMRBRR, processFMPRBMR, processFMPSM, processFMPDDD, processFMTCFP, processFMCFP, processFMMFRP, processFMPDCD, processFMMFA, processFMPCP, processFMPASF, processFMPPD, processFMPDD, processFMMFD, processFMPMFI, processFMPMIP, processFMPMIPD, processFMSD, processFMTUE } from './actions.ts'

export type InvestmentGroupButtonStatus = 'successful' | 'failed' | 'not_done' | 'irrelevant'

export type ProcessInvestmentGroup = {
  name: string
  state: boolean
  status?: InvestmentGroupButtonStatus
}

export type InvestmentGroupResultCallback = (investmentGroupName: string, success: boolean) => void

function isActiveInvestmentGroup(group: ProcessInvestmentGroup): boolean {
  const status = group.status ?? (group.state ? 'not_done' : 'irrelevant')
  return status === 'failed' || status === 'not_done'
}

export async function processFMSDbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  return processFMSD(_fundValDate)
}

export async function processFMPPFRbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPPFR(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPPPbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPPP(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPIVbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPIV(fundValDate)
}

export async function processFMFVRMbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMFVRM(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPFVbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  return processFMPFV()
}

export async function processFMFVbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMFV(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMBALbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMBAL(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPIbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPI(fundValDate, new Date())
}

export async function processFMPRDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPRD(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPIDbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  return processFMPID()
}

export async function processFMPPPDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPPPD(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMDCbutton(environment: string, company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMDC(environment, company, fundValDate)
}

export async function processFMITIHbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMITIH(fundValDate)
}

export async function processFMDIHbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMDIH(fundValDate)
}

export async function processFMATIbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  return processFMATI()
}

export async function processFMHAIbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  return processFMHAI()
}

export async function processFMCPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMCP(fundValDate)
}

export async function processFMTUEbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMTUE(fundValDate)
}

export async function processFMDRMbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMDRM(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMCIAbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMCIA(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMDPbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMDP(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMBSbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMBS(fundValDate)
}

export async function processFMPRPCbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPRPC(fundValDate)
}

export async function processFMFCPSbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMFCPS(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMRBFSRbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMRBFSR(fundValDate)
}

export async function processFMPSMbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPSM('', investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPDDDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const _investmentGroup of activeInvestmentGroups) {
    if (!await processFMPDDD(fundValDate, '1')) return false
  }

  return true
}

export async function processFMARbutton(environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMAR(environment, fundValDate)
}

export async function processFMTCFPbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMTCFP(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPIFbutton(environment: string, company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  window.alert(`Process handler invoked in ${environment} for ${company}: processFMPIFbutton (${fundValDate.toLocaleDateString()}); investment groups: ${investmentGroups.map((group) => group.name).join(',') || 'none'}`); return true
}

export async function processFMPMIPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPMIP(fundValDate, '1')
}

export async function processFMRBRRbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMRBRR(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPRBMRbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPRBMR(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPDCDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPDCD(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMMFRPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMMFRP(fundValDate)
}

export async function processFMMFAbutton(environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMMFA(environment, investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPASFbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPASF(fundValDate, '1')
}

export async function processFMPPDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPPD(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMDIRMbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMDIRM(investmentGroup.name, fundValDate, '', '', '', '')
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPCPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPCP(fundValDate)
}

export async function processFMPSMREPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  window.alert('Not yet implemented')
  return false
}

export async function processFMPFBBRbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMPFBBR(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPMIPDbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPMIPD(fundValDate, '1')
}

export async function processFMSWGbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  window.alert('Not yet implemented')
  return false
}

export async function processFMPMFIbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPMFI(fundValDate)
}

export async function processFMCFPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMCFP(fundValDate)
}

export async function processFMMFDbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMMFD(investmentGroup.name, fundValDate)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMPDDbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], fundValDate: Date) {
  return processFMPDD(fundValDate, '1')
}

export async function processFMAPTPbutton(_environment: string, _company: string, investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date, onInvestmentGroupResult?: InvestmentGroupResultCallback) {
  const activeInvestmentGroups = investmentGroups.filter(isActiveInvestmentGroup)
  if (activeInvestmentGroups.length === 0) return false

  for (const investmentGroup of activeInvestmentGroups) {
    const success = await processFMAPTP(investmentGroup.name)
    onInvestmentGroupResult?.(investmentGroup.name, success)
    if (!success) return false
  }

  return true
}

export async function processFMEOYFGbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  window.alert('Not yet implemented')
  return false
}

export async function processFMEOYPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  window.alert('Not yet implemented')
  return false
}

export async function processFMAPEOYPbutton(_environment: string, _company: string, _investmentGroups: ProcessInvestmentGroup[], _fundValDate: Date) {
  window.alert('Not yet implemented')
  return false
}