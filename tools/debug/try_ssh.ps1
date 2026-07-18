$plink = "C:\Program Files\PuTTY\plink.exe"
$upass = "IMV*2025*"
$hostname = "192.168.1.94"

# First clear the known hosts for plink (remove old bad entry)
$null = Remove-ItemProperty "HKCU:\Software\SimonTatham\PuTTY\SshHostKeys" -Name "rsa2@22:192.168.1.94" -ErrorAction SilentlyContinue
$null = Remove-ItemProperty "HKCU:\Software\SimonTatham\PuTTY\SshHostKeys" -Name "ssh-ed25519@22:192.168.1.94" -ErrorAction SilentlyContinue

Write-Output "Waiting for SSH on ${hostname}:22..."

for ($i = 1; $i -le 12; $i++) {
    # Check if port is open
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($hostname, 22, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne(3000)
    if ($wait) {
        $tcp.EndConnect($async)
        $tcp.Close()
        Write-Output "[${i}] Port 22 OPEN - trying plink..."
        
        # Try to accept host key and run command
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $plink
        $psi.Arguments = "-ssh -l admin -pw ${upass} ${hostname} /ping 192.168.1.1 count=3 && /ip route print where dst-address=0.0.0.0/0 && /ip arp print where interface=bridge1"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $p = [System.Diagnostics.Process]::Start($psi)
        Start-Sleep -Milliseconds 500
        $p.StandardInput.WriteLine("yes")
        $p.StandardInput.Close()
        $output = $p.StandardOutput.ReadToEnd()
        $p.WaitForExit(15000)
        Write-Output "Exit: $($p.ExitCode)"
        Write-Output "$output"
        
        if ($p.ExitCode -eq 0) {
            Write-Output "SUCCESS! SSH commands executed."
            exit 0
        }
    } else {
        Write-Output "[${i}] Port 22 CLOSED, waiting..."
        $tcp.Dispose()
    }
    Start-Sleep -Seconds 5
}

Write-Output "Failed after 12 attempts"
exit 1
