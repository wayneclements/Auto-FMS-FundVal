$outputPath = Join-Path $PSScriptRoot 'sample-fund-valuation-run-sheets.xml'
$runSheetNames = @('First Run Sheet', 'Second Run Sheet', 'Third Run Sheet', 'Fourth Run Sheet', 'Fifth Run Sheet')
$fundValTypes = @(
  @{ Name = 'Fund Valuation Only'; ProcessCount = 10 },
  @{ Name = 'Unit Pricing'; ProcessCount = 12 },
  @{ Name = 'Distribution'; ProcessCount = 15 },
  @{ Name = 'Tax Processing'; ProcessCount = 10 },
  @{ Name = 'Reconciliation'; ProcessCount = 12 },
  @{ Name = 'Reporting'; ProcessCount = 15 }
)
$investmentGroups = @('10', '11', '50', '51', '65', '70', '90', '120')
$xml = [System.Text.StringBuilder]::new()

[void]$xml.AppendLine('<?xml version="1.0" encoding="utf-8"?>')
[void]$xml.AppendLine('<RunSheets xmlns="http://www.test.com/engine/3">')

for ($runSheetIndex = 0; $runSheetIndex -lt $runSheetNames.Count; $runSheetIndex++) {
  [void]$xml.AppendLine("  <RunSheet Name=`"$($runSheetNames[$runSheetIndex])`">")

  for ($companyIndex = 1; $companyIndex -le 5; $companyIndex++) {
    $companyNumber = '{0:D3}' -f (($runSheetIndex * 5) + $companyIndex)
    [void]$xml.AppendLine("    <Company Name=`"$companyNumber`">")

    foreach ($fundValType in $fundValTypes) {
      [void]$xml.AppendLine("      <FundValType Name=`"$($fundValType.Name)`" LastFundValDate=`"2026-08-27`" LastTotalUnitsExtractRunDate=`"2026-08-27`">")

      for ($processIndex = 1; $processIndex -le $fundValType.ProcessCount; $processIndex++) {
        [void]$xml.AppendLine("        <Process Name=`"$($fundValType.Name) Process $processIndex`" Description=`"Synthetic $($fundValType.Name.ToLower()) process $processIndex`">")

        for ($groupIndex = 0; $groupIndex -lt $investmentGroups.Count; $groupIndex++) {
          $state = if (($processIndex + $groupIndex) % 2 -eq 0) { 'true' } else { 'false' }
          [void]$xml.AppendLine("          <InvestmentGroup Name=`"$($investmentGroups[$groupIndex])`" State=`"$state`" />")
        }

        [void]$xml.AppendLine('        </Process>')
      }

      [void]$xml.AppendLine('      </FundValType>')
    }

    [void]$xml.AppendLine('    </Company>')
  }

  [void]$xml.AppendLine('  </RunSheet>')
}

[void]$xml.AppendLine('</RunSheets>')
$xml.ToString() | Set-Content -Path $outputPath -Encoding utf8

Write-Output "Created $outputPath"
Write-Output "Run sheets: 5; companies: 25; FundVal types: 150; processes: 1,850; investment groups: 14,800"