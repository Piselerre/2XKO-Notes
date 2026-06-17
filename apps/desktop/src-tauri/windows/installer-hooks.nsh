; 2XKO Notes — custom NSIS hooks (English)
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

Var UninstDeleteNotes
Var UninstDialog
Var UninstCheckbox
Var UninstTitle
Var UninstBody

Function un.NotesDeleteDialog
  nsDialogs::Create 1018
  Pop $UninstDialog
  ${If} $UninstDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 14u "Uninstalling 2XKO Notes"
  Pop $UninstTitle

  ${NSD_CreateLabel} 0 18u 100% 40u "Your notes in Documents\2XKO Notes\ are kept by default. They survive updates and reinstalls."
  Pop $UninstBody

  ${NSD_CreateCheckbox} 0 64u 100% 14u "Delete my local notes permanently (cannot be undone)"
  Pop $UninstCheckbox
  ${NSD_Uncheck} $UninstCheckbox

  nsDialogs::Show
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_GetState} $UninstCheckbox $UninstDeleteNotes
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  MessageBox MB_ICONINFORMATION|MB_OK "Your local notes are safe.$\r$\n$\r$\nThey live in Documents\2XKO Notes\ and will NOT be removed when you update or reinstall 2XKO Notes."
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Call un.NotesDeleteDialog
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UninstDeleteNotes == ${BST_CHECKED}
    RMDir /r "$DOCUMENTS\2XKO Notes"
  ${EndIf}
!macroend
