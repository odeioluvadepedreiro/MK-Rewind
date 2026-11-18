# Preparação MANUAL e explícita. Não roda dentro da extensão. Não atualiza automaticamente.
# Código-fonte MIT: https://github.com/ryanbr/TwitchAdSolutions
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$shaGit='c80fb54fb3bedc72d0b2d0cf8ad3e90607fa6744'
$repoCommit='e4dfb26755cb440f9ec6a2430a9b131fa1de062a'
$url="https://raw.githubusercontent.com/ryanbr/TwitchAdSolutions/$repoCommit/vaft/vaft.user.js"
$folder=Split-Path -Parent $MyInvocation.MyCommand.Path
$tmp=Join-Path $folder 'adblock_video.js.tmp'
$dest=Join-Path $folder 'adblock_video.js'
try {
  Write-Host 'Baixando VAFT de um commit fixo do Github...'
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  $bytes=[System.IO.File]::ReadAllBytes($tmp)
  $header=[System.Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
  $all=New-Object byte[] ($header.Length + $bytes.Length)
  [System.Buffer]::BlockCopy($header,0,$all,0,$header.Length)
  [System.Buffer]::BlockCopy($bytes,0,$all,$header.Length,$bytes.Length)
  $sha=[System.Security.Cryptography.SHA1]::Create()
  $computed=([System.BitConverter]::ToString($sha.ComputeHash($all))).Replace('-','').ToLowerInvariant()
  if ($computed -ne $shaGit) { throw "Arquivo diferente do publicado: hash Git $computed, esperado $shaGit. Nenhuma alteracao feita." }
  Move-Item -Force -Path $tmp -Destination $dest
  Write-Host 'VAFT verificado e integrado! Recarregue a extensao no Chrome.' -ForegroundColor Green
} catch {
  Write-Host ("Erro: " + $_.Exception.Message) -ForegroundColor Red
  exit 1
} finally {
  Remove-Item -ErrorAction SilentlyContinue $tmp
}
