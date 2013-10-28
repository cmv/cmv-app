/****************************************************************************************
*	Copyright (c) 2012, Peter Jekel
*	All rights reserved.
*
*	The Checkbox Tree File Store CGI (cbtreeFileStore) is released under to following
*	license:
*
*	    BSD 2-Clause		(http://thejekels.com/cbtree/LICENSE)
*
*	@author		Peter Jekel
*
****************************************************************************************
*
*	Description:
*
*		This module provides all the functionality to search file paths, match
*		files agains a set of query arguments and sort file lists on the fly.
*
*	NOTE:	In contrast to the PHP implementation, the CGI implementation sorts
*			any file list on the fly. Therefore the are no calls to functions
*			like the PHP usort()
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <direct.h>
#include <errno.h>
#include <io.h>

#include "cbtree_NP.h"
#include "cbtreeDebug.h"
#include "cbtreeFiles.h"
#include "cbtreeURI.h"
#include "cbtreeString.h"

#define compareStr(a,b,c) ((c) ? stricmp((a),(b)) : strcmp((a),(b)))
#define compareInt(a,b) ((a) == (b) ? 0 : ( (a)<(b) ? -1 : 1))

typedef struct fileList {
	FILE_INFO	*pFirst;	// First file list entry
	FILE_INFO	*pLast;		// Last file list entry
} FILE_LIST;

static const char *pcFileProp[] = { "name", "path", "directory", "size", "modified", NULL };

static int _removeFile( LIST *pFileList, FILE_INFO *pFileInfo, char *pcRootDir, ARGS *pArgs, int *piResult );

/**
*	_destroyFileInfo
*
*		Release all resources associated with a FILE_INFO struct. If the file has
*		child elements linked to it all of them are release as well.
*
*	@param	pFileInfo		Address FILE_INFO struct.
**/
static void _destroyFileInfo( FILE_INFO *pFileInfo )
{
	if( pFileInfo )
	{
		free( pFileInfo->pcName );
		free( pFileInfo->pcPath );
		if( pFileInfo->pChildren )
		{
			destroyList( &pFileInfo->pChildren, _destroyFileInfo );
		}
		free( pFileInfo );
	}
}

/**
*	_fileFilter
*
*		Returns true if a file is to be exlcuded (filtered) based on the HTTP query
*		string parameters, otherwise false.
*
*	@param	pFileInfo		Address FILE_INFO struct.
*	@param	pArgs			Address query string arguments struct
* 
*	@return	true or false
**/
static bool _fileFilter( FILE_INFO *pFileInfo, ARGS *pArgs )
{
	OPTIONS	*pOptions = pArgs->pOptions;

	if( (!pOptions->bShowHiddenFiles && (pFileInfo->pcName[0] == '.' || pFileInfo->bIsHidden)) ||
		(!strcmp(pFileInfo->pcName, ".") || !strcmp(pFileInfo->pcName, "..")) )
	{
		return true;
	}
	return false;
}

/**
*	_removeDirectory
*
*		Delete a directory. The content of the directory is deleted after which
*		the directory itself is delete.
*
*	@param	pFileList		Address LIST struct containing all deleted files.
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND, HTTP_V_UNAUTHORIZED or
*							HTTP_V_SERVER_ERROR
*
*	@return		1 if successful otherwise 0.
**/
static int _removeDirectory( LIST *pFileList, char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	FILE_INFO	*pDirectory;
	LIST	*pDirList, 
			*pChildList;
	ENTRY	*pEntry;
	int		iResult,
			iMode = 0777;
	
	if( (pDirList = getFile( pcFullPath, pcRootDir, pArgs, piResult )) )
	{
		pDirectory = pDirList->pNext->pvData;
		if( pDirectory )
		{
			pChildList = pDirectory->pChildren;

			chmod( pcFullPath, iMode );
			// Delete directory content		
			for( pEntry = pChildList->pNext; pEntry != pChildList; pEntry = pEntry->pNext )
			{
				iResult = _removeFile( pFileList, pEntry->pvData, pcRootDir, pArgs, piResult );
				if( iResult )
				{
					// Detach child from list so it won't be destroyed.
					pEntry->pvData = NULL;
				}
			}
			destroyFileList( &pDirList );

			*piResult = HTTP_V_OK;
		}
		// Now delete the directory itself.
		return rmdir( pcFullPath );
	}
	return ENOENT;
}

/**
*	removeFile
*
*		Delete a file or directory. If the file is a directory the directory and
*		its content is deleted. Deleted files are added to the list of deleted
*		files 'pFileList'.
*
*	@param	pFileList		Address LIST struct containing all deleted files.
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND, HTTP_V_UNAUTHORIZED or
*							HTTP_V_SERVER_ERROR
*
*	@return		1 if successful otherwise 0.
**/
static int _removeFile( LIST *pFileList, FILE_INFO *pFileInfo, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	char	cFilePath[MAX_PATH_SIZE];
	int		iResult,
			iMode = 0666;

	if( pFileInfo )
	{
		*piResult = HTTP_V_OK;
		snprintf( cFilePath, sizeof(cFilePath)-1, "%s/%s", pcRootDir, pFileInfo->pcPath );
		normalizePath( cFilePath );
		if( pFileInfo->directory )
		{
			iResult = _removeDirectory( pFileList, cFilePath, pcRootDir, pArgs, piResult );
		}
		else
		{
			chmod( cFilePath, iMode );
			iResult = remove( cFilePath );
		}
		// If success, add to the list of deleted files.
		if( iResult == 0 ) 
		{
			insertTail( pFileInfo, pFileList );
		}
		else
		{
			switch( errno )
			{
				case ENOTEMPTY:	// Directory not empty
				case EACCES:	// Access denied
				case EPERM:		// No permission
				case EBUSY:		// System file
				case EROFS:		// Read-only File System
					*piResult = HTTP_V_UNAUTHORIZED;
					break;				
				case ENOENT:
					*piResult = HTTP_V_NOT_FOUND;
					break;
				default:
					*piResult = HTTP_V_SERVER_ERROR;
					break;
			}
			cbtDebug( "DELETE [%s] errno: %d", cFilePath, errno );
		}
		return (iResult ? 0 : 1);
	}
	*piResult = HTTP_V_NO_CONTENT;
	return 0;
}

/**
*	destroyFileList
*
*		Release all resources associated with a file list. Not only is the list deleted
*		but also ALL FILIE_INFO structs the list referencing.
*
*	@param	ppFileList		Address of a pointer of type LIST.
**/
void destroyFileList( LIST **ppFileList )
{
	destroyList( ppFileList, _destroyFileInfo );
}

/**
*	fileCount
*
*		Returns the number of files in a linked list. If parameter iDeep equals true a
*		recursive count is performed, that is, all children in directories are included
*		in the total count. By default only siblings of pFileInfo are counted.
*
*	@param	pFileInfo		Address FILE_INFO struct.
*	@param	iDeep			Boolean, if true a recursive count is performed counting
*							all files and their children, if any.
*
*	@return		The number of files counted.
**/
int fileCount( LIST *pFileList, bool iDeep )
{
	FILE_INFO	*pFileInfo;
	ENTRY		*pEntry;
	int			iCount = 0;

	for( pEntry = pFileList->pNext; pEntry != pFileList; pEntry = pEntry->pNext )
	{
		pFileInfo = (FILE_INFO *)pEntry->pvData;
		
		if( pFileInfo->pChildren && iDeep)
		{
			iCount += fileCount( pFileInfo->pChildren, iDeep );
		}
		iCount++;
	}
	return iCount;
}

/**
*	getDirectory
*
*		Returns the content of a directory as a linked list of FILE_INFO structs.
*
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND or HTTP_V_NO_CONTENT
*
*	@return		Address LIST struct or NULL in case no match was found.
**/
LIST *getDirectory( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	FILE_INFO	*pFileInfo;
	OPTIONS		*pOptions = pArgs->pOptions;
	OS_ARG		OSArg;
	LIST		*pFileList = NULL;
	char		cFullPath[MAX_PATH_SIZE];
	int			iResult;
	
	snprintf( cFullPath, sizeof(cFullPath)-1,"%s/*", pcFullPath );
	if( (pFileInfo = findFile_NP( cFullPath, pcRootDir, &OSArg, pArgs, piResult )) )
	{
		pFileList = newList();		// Allocate a new list header.
		do {
			if( !_fileFilter( pFileInfo, pArgs ) )
			{
				if( pFileInfo->directory && pOptions->bDeep )
				{
					snprintf( cFullPath, sizeof(cFullPath)-1, "%s/%s", pcFullPath, pFileInfo->pcName );
					pFileInfo->pChildren  = getDirectory( cFullPath, pcRootDir, pArgs, &iResult );
					pFileInfo->iPropMask |= PROP_M_CHILDREN;
				}
				insertTail( pFileInfo, pFileList );
				*piResult = HTTP_V_OK;
			}
			else // File was filtered out
			{
				_destroyFileInfo( pFileInfo );
			}
		} while ( (pFileInfo = findNextFile_NP( cFullPath, pcRootDir, &OSArg, pArgs )) );

		if( listIsEmpty( pFileList ) )
		{
			*piResult = HTTP_V_NO_CONTENT;
		}
		findEnd_NP( &OSArg );		
	}
	return pFileList;
}

/**
*	getFile
*
*		Returns the information for the file specified by parameter pcFullPath.
*		If the designated file is a directory the directory content is returned
*		as the children of the file.
*
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND or HTTP_V_NO_CONTENT
*
*	@return		Address LIST struct or NULL in case no match was found.
**/
LIST *getFile( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	FILE_INFO	*pFileInfo;
	OS_ARG		OSArg;
	LIST		*pFileList = NULL;
	
	if( (pFileInfo = findFile_NP( pcFullPath, pcRootDir, &OSArg, pArgs, piResult )) )
	{
		if( !_fileFilter( pFileInfo, pArgs ) )
		{
			if( pFileInfo->directory )
			{
				pFileInfo->pChildren  = getDirectory( pcFullPath, pcRootDir, pArgs, piResult );
				pFileInfo->iPropMask |= PROP_M_CHILDREN;
			}
			// Don't give away any part of the root directory.
			if( !strcmp( pcFullPath, pcRootDir)) {
				free( pFileInfo->pcName );
				free( pFileInfo->pcPath );
				pFileInfo->pcName = mstrcpy(".");
				pFileInfo->pcPath = mstrcpy(".");
			}
			pFileList = newList();
			insertTail( pFileInfo, pFileList );
			*piResult = HTTP_V_OK;
		}
		else // File was excluded
		{
			_destroyFileInfo( pFileInfo );
			*piResult = HTTP_V_NO_CONTENT;
		}
		findEnd_NP( &OSArg );		
	}
	return pFileList;
}

/**
*	getPropertyId
*
*		Return the identification (index) of a file property.
*
*	@param	pcProperty			Address C-string containing the property name.
*
*	@return		Integer property id.
**/
int getPropertyId( const char *pcProperty )
{
	int	i;

	for( i=0; pcFileProp[i]; i++ )
	{
		if( !strcmp( pcProperty, pcFileProp[i] ) )
		{
			return i;
		}
	}
	return PROP_M_UNKNOWN;
}

/**
*	getRelativePath
*
*		Returns the relative path for the file identified by pcFilename. The relative
*		path is constructed by removing the leading root directory segments and the
*		last segment from the full path after which the filename is appended. Given
*		the following example:
*
*			Full path = "c:/myroot_dir/html/demos/*"
*			Root dir  = "c:/myroot_dir/"
*			Filename  = "license.txt"	
*
*		The relative path will be: "./html/demos/license.txt"
*
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pcFilename		Address C-string containing the filename
*	@param	ppcPath			Address of a char pointer pointing to the location at
*							which the relative path will be stored.
*
*	@return		Address C-string containing the relative path (*ppcPath).
**/
char *getRelativePath( char *pcFullPath, char *pcRootDir, char *pcFilename, char **ppcPath )
{
	char	cPath[MAX_PATH_SIZE];
	char	*pcRelPath,
			*pcPath = cPath,
			*pcOffset;
	int		iLen;

	*pcPath++ = '.';
	pcOffset = pcPath;
	
	if( pcFullPath )
	{
		iLen = strlen( pcRootDir );
		pcRelPath = &pcFullPath[iLen];
		
		while( (*pcPath++ = *pcRelPath++) );
		while( --pcPath != pcOffset ) 
		{
			if( *pcPath == '/' )  
			{
				break;
			}
		}
	}	
	*pcPath++ = '/';
	while( (*pcPath++ = *pcFilename++) );
	return strcpy( *ppcPath, cPath );
}

/**
*	removeFile
*
*		Delete a file or directory. If the file is a directory the content of the
*		directory is deleted resurcive.
*
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND, HTTP_V_UNAUTHORIZED or
*							HTTP_V_SERVER_ERROR
*
*	@return		Address LIST struct containing all files deleted.
**/
LIST *removeFile( FILE_INFO *pFileInfo, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	LIST	*pFileList = newList();

	*piResult = HTTP_V_NO_CONTENT;

	// Set the appropriate options so we catch hidden files and don't include more
	// info than we need in the output.
	pArgs->pOptions->bShowHiddenFiles = true;
	pArgs->pOptions->bDeep			  = false;

	if( pFileInfo )
	{
		_removeFile( pFileList, pFileInfo, pcRootDir, pArgs, piResult );
	}
	return pFileList;
}

/**
*	renameFile
*
*		Rename a file
*
*	@param	pcFullPath		Address C-string containing the full directory path.
*	@param	pcRootDir		Address C-string containing the root directory.
*	@param	pArgs			Address arguments struct
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_NOT_FOUND or HTTP_V_NO_CONTENT
*
*	@return		Address LIST struct or NULL in case no match was found.
**/
LIST *renameFile( char *pcFullPath, char *pcRootDir, ARGS *pArgs, int *piResult )
{
	FILE_INFO	*pFileInfo;
	LIST		*pFileList = NULL;
	OS_ARG		OSArg;
	char		cNewPath[MAX_PATH_SIZE],
				cRelPath[MAX_PATH_SIZE];
		
	if( (pFileInfo = findFile_NP( pcFullPath, pcRootDir, &OSArg, pArgs, piResult )) )
	{
		// Save the current relative file path.
		strcpy( cRelPath, pFileInfo->pcPath );
		_destroyFileInfo( pFileInfo );

		snprintf( cNewPath, sizeof(cNewPath)-1, "%s/%s", pcRootDir, pArgs->pcNewValue );
		strtrim( normalizePath( cNewPath ), TRIM_M_WSP );
		if( !strncmp( pcRootDir, cNewPath, strlen(pcRootDir)) )
		{
			if(rename(pcFullPath, cNewPath))
			{
				switch( errno )
				{
					case ENOTEMPTY:	// Directory not empty
					case EACCES:	// Access denied
					case EPERM:		// No permission
					case EBUSY:		// System file
					case EROFS:		// Read-only File System
					case EXDEV:		// Two different file systems.
						*piResult = HTTP_V_UNAUTHORIZED;
						break;
					case EEXIST:	
						*piResult = HTTP_V_CONFLICT;
						break;
					case ENOENT:
						*piResult = HTTP_V_NOT_FOUND;
						break;
					default:
						*piResult = HTTP_V_SERVER_ERROR;
						break;
				}
				cbtDebug( "POST Oldname: [%s], newname: [%s], (error: %d, %s )", 
						  pcFullPath, cNewPath, errno, strerror(errno) );
			}
			else
			{
				if( (pFileInfo = findFile_NP( cNewPath, pcRootDir, NULL, pArgs, piResult )) )
				{
					pFileInfo->pcOldPath  = mstrcpy( cRelPath );
					pFileInfo->iPropMask |= PROP_M_OLDPATH;

					pFileList = newList();
					insertTail( pFileInfo, pFileList );
				}
			}
		}
		else
		{
			*piResult = HTTP_V_FORBIDDEN;
		}
	}
	return pFileList;
}

