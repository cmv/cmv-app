#ifndef _CBTREE_ARGS_H_
#define _CBTREE_ARGS_H_

#include "cbtreeTypes.h"
#include "cbtreeList.h"

typedef struct options {
	bool	bDeep;					// Indicate if a recursive search is to be performed.
	bool	bIgnoreCase;			// Match filename and path case insensitive.
	bool	bShowHiddenFiles;		// Indicate if hidden files are to be included.
	bool	bDebug;					// Indicate if debug information need to be generated.
} OPTIONS;

typedef struct arguments {
	const char	*pcBasePath;		// Pointer to a C-string containing the base path
	const char	*pcPath;			// Pointer to a C-string containing the path
	char		*pcNewValue;		// Pointer to a C-string containing the new attribute value
	DATA		*pAuthToken;		// Custom authentication token.
	OPTIONS		*pOptions;			// Pointer to the query options struct
	LIST		*pQueryList;		// Address query arguments list
} ARGS;

#ifdef __cplusplus
	extern "C" {
#endif

void  destroyArguments( ARGS **ppArgs );
ARGS *getArguments( int *piResult );

#ifdef __cplusplus
	}
#endif

#endif /* _CBTREE_ARGS_H_ */
