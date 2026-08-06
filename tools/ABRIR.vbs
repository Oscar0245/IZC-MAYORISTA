' Auto-inicio IZC: actualiza el servidor y abre el navegador (sin ventana de consola).
Option Explicit
Dim sh, fso, root
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)

' Breve espera al iniciar sesion para que Windows termine de cargar.
WScript.Sleep 2500

sh.Run """" & root & "\ABRIR.bat""", 0, True
