#ifndef _CBTREE_NP_H_
#define _CBTREE_NP_H_

#ifdef WIN32
  #include <windows.h>
  // Use ANSI version of FindFirstFile() and FindNextFile()
  #ifdef FindFirstFile
	#undef FindFirstFile
  #endif	
  #ifdef FindNextFile
	#undef FindNextFile
  #endif
  #define FindFirstFile		FindFirstFileA
  #define FindNextFile		FindNextFileA
  #define WIN32_FIND_DATA	WIN32_FIND_DATAA
#endif /* WIN32 */

#include "cbtreeFiles.h"

typedef struct OS_ARG {
#ifdef WIN32
	HANDLE		handle;
#endif /* WIN32 */
} OS_ARG;

#ifdef __cplusplus
	extern "C" {
#endif

FILE_INFO *findFile_NP( char *pcFullPath, char *pcRootDir, void *pvOsArgm, ARGS *pArgs, int *piResult );
FILE_INFO *findNextFile_NP( char *pcFullPath, char *pcRootDir, void *pvOsArgm, ARGS *pArgs );
void findEnd_NP( void *pvOsArg );

#ifdef __cplusplus
	}
#endif

#endif	/* _CBTREE_WIN_H_ */
