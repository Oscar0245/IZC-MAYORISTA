' Inicia el vigilante de precios IZC en segundo plano (sin ventana).
' Este .vbs vive en tools\; la raiz del proyecto es la carpeta padre.
Option Explicit
Dim sh, fso, scriptDir, root, cmd, pythonw, candidates, i, p
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(scriptDir)
sh.CurrentDirectory = root

candidates = Array( _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Python\bin\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Python\pythoncore-3.14-64\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Python\pythoncore-3.13-64\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Python\pythoncore-3.12-64\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python314\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python313\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python312\pythonw.exe"), _
  sh.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python311\pythonw.exe"), _
  "C:\Python314\pythonw.exe", _
  "C:\Python313\pythonw.exe", _
  "C:\Python312\pythonw.exe" _
)

pythonw = ""
For i = 0 To UBound(candidates)
  p = candidates(i)
  If p <> "" And fso.FileExists(p) Then
    pythonw = p
    Exit For
  End If
Next

If pythonw <> "" Then
  cmd = """" & pythonw & """ """ & root & "\src\vigilar_precios.py"""
Else
  cmd = "cmd /c py -3w """ & root & "\src\vigilar_precios.py"""
End If

sh.Run cmd, 0, False
