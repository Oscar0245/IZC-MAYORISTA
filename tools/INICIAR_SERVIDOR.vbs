' Inicia o actualiza el servidor local IZC en segundo plano (sin ventana).
' Reinicia automaticamente si la API esta desactualizada o el script cambio.
Option Explicit
Dim sh, fso, scriptDir, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\servidor_control.ps1"" -Action ensure"
' 0 = oculto, True = esperar a que termine
sh.Run cmd, 0, True
