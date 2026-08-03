' Abre IZC: arranca el servidor (si hace falta) y el navegador
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "wscript.exe //nologo """ & root & "\INICIAR_SERVIDOR.vbs""", 0, True
WScript.Sleep 800
sh.Run "http://127.0.0.1:8080/index.html", 1, False
