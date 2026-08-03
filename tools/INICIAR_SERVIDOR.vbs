' Inicia el servidor local IZC en segundo plano (sin ventana) si no esta activo.
' Necesario para guardar NIT/contraseña en data\usuarios.json
Option Explicit
Dim sh, fso, scriptDir, alive, http, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

alive = False
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
If Err.Number = 0 Then
  http.Open "GET", "http://127.0.0.1:8080/data/usuarios.json", False
  http.setRequestHeader "Cache-Control", "no-cache"
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then alive = True
  End If
End If
Err.Clear
On Error GoTo 0

If Not alive Then
  cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\servidor_local.ps1"" -NoBrowser"
  ' 0 = oculto
  sh.Run cmd, 0, False
  WScript.Sleep 1500
End If
