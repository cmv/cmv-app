#ifndef _CBTREE_FILES_H_
#define _CBTREE_FILES_H_

#include "cbtreeArgs.h"
#include "cbtreeList.h"

// Define symbolic file properties
#define PROP_M_UNKNOWN		0X00
#define PROP_M_NAME			0x01
#define PROP_M_PATH			0x02
#define PROP_M_DIRECTORY	0x04
#define PROP_M_SIZE			0x08
#define PROP_M_MODIFIED		0x10
#define PROP_M_CHILDREN		0X20
#define PROP_M_OLDPATH		0X40

#define PROP_M_DEFAULT		PROP_M_NAME | PROP_M_PATH | PROP_M_SIZE | PROP_M_MODIFIED

typedef struct fileInfo {
	int		iPropMask;			// Properties mask (indicates which of the following properties are set).
	char	*pcName;			// Pointer to C-string containing the filename
	char	*pcPath;
	char	*pcOldPath;			// Pointer to C-string containing the old path (rename only).
	long	lSize;				// File size
	long	lModified;			// Last modified (seconds since Jan 1, 1970)
	bool	directory;			// True if file is a directory
	bool	bIsHidden;			// True if file is marked as hidden.
	LIST	*pChildren;			// List of children (directory only).
} FILE_INFO;

#ifdef __cplusplus
	extern "C" {
#endif

void  destroyFileList( LIST **ppList );
int	  fileCount( LIST *pFileList, bool iDeep );
int   getPropertyId( const char *pcProperty );
LIST *getDirectory( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult );
LIST *getFile( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult );

char *getRelativePath( char *pcFullPath, char *pcRootDir, char *pcFilename, char **ppcPath );

LIST *removeFile( FILE_INFO *pFileInfo, char *pcRootDir, ARGS *pArgs, int *piResult );
LIST *renameFile( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult );

#ifdef __cplusplus
	}
#endif

#endif	/* _CBTREE_FILES_H_ */
