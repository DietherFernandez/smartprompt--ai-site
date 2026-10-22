param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$OutFile,
    [string]$SelectNav = '',
    [int]$Scroll = 0
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class WindowCapture
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint flags);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

$process = Get-Process SmartPromptAI -ErrorAction Stop | Select-Object -First 1
$handle = [IntPtr]::Zero

foreach ($window in $process.MainWindowHandle) { $handle = $window }

# Find the window by title among all top-level windows of the process.
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class WindowFinder
{
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    public static List<string> Titles(uint targetProcessId)
    {
        var result = new List<string>();
        EnumWindows((hWnd, lParam) =>
        {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetProcessId && IsWindowVisible(hWnd))
            {
                var length = GetWindowTextLength(hWnd);
                var builder = new StringBuilder(length + 1);
                GetWindowText(hWnd, builder, builder.Capacity);
                result.Add(hWnd.ToInt64() + "|" + builder.ToString());
            }

            return true;
        }, IntPtr.Zero);

        return result;
    }
}
'@

$target = $null
foreach ($entry in [WindowFinder]::Titles([uint32]$process.Id)) {
    $parts = $entry.Split('|', 2)
    if ($parts[1] -eq $Title) { $target = [IntPtr][int64]$parts[0] }
}

if ($target -eq [IntPtr]::Zero) {
    Write-Error "Window '$Title' not found."
    exit 1
}

[WindowCapture]::ShowWindow($target, 9) | Out-Null
[WindowCapture]::SetForegroundWindow($target) | Out-Null
Start-Sleep -Milliseconds 700

if ($SelectNav -or $Scroll -gt 0) {
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes

    $root = [System.Windows.Automation.AutomationElement]::FromHandle($target)

    if ($SelectNav) {
        $condition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::ListItem)
        $items = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

        foreach ($item in $items) {
            if ($item.Current.Name -like "*Label = $SelectNav*") {
                $selection = $item.GetCurrentPattern(
                    [System.Windows.Automation.SelectionItemPattern]::Pattern)
                $selection.Select()
                Start-Sleep -Milliseconds 1200
                break
            }
        }
    }

    if ($Scroll -gt 0) {
        Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class MouseInput
{
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, int data, UIntPtr extraInfo);

    public static void Scroll(int x, int y, int notches)
    {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(200);
        mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
        mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(200);
        for (int i = 0; i < notches; i++)
        {
            mouse_event(0x0800, 0, 0, -120, UIntPtr.Zero);
            System.Threading.Thread.Sleep(120);
        }
    }
}
'@

        $rect = New-Object WindowCapture+RECT
        [WindowCapture]::GetWindowRect($target, [ref]$rect) | Out-Null
        [MouseInput]::Scroll(
            $rect.Left + 700,
            $rect.Top + 400,
            [int][Math]::Ceiling($Scroll / 120))
        Start-Sleep -Milliseconds 900
    }
}

$rect = New-Object WindowCapture+RECT
[WindowCapture]::GetWindowRect($target, [ref]$rect) | Out-Null
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

if ($width -le 0 -or $height -le 0) {
    Write-Error "Window '$Title' has no size."
    exit 1
}

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
[WindowCapture]::PrintWindow($target, $hdc, 2) | Out-Null
$graphics.ReleaseHdc($hdc)
$graphics.Dispose()

$bitmap.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Output "Captured '$Title' ($width x $height) -> $OutFile"
