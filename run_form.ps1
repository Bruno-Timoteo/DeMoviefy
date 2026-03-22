param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsRemaining
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$script = Join-Path $root "run_form.py"

if (Test-Path $venvPython) {
    $py = $venvPython
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $py = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $py = "py"
} else {
    Write-Error "Python not found in PATH. Install Python or add it to PATH."
    exit 1
}

& $py $script @ArgsRemaining
