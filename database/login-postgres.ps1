[CmdletBinding()]
param(
  [string]$HostName = 'localhost',
  [int]$Port = 5432,
  [string]$Database = 'postgres'
)

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  throw 'psql was not found. Install PostgreSQL or add its bin directory to PATH.'
}

& $psql.Source --host $HostName --port $Port --username postgres --dbname $Database
exit $LASTEXITCODE