#ifndef _CBTREE_DEBUG_H_
#define _CBTREE_DEBUG_H_

#include <stdarg.h>

#ifdef __cplusplus
	extern "C" {
#endif

void cbtDebug( const char *pcFormat, ... );
void cbtDebugEnd();

#ifdef __cplusplus
	}
#endif


#endif /* _CBTREE_DEBUG_H_ */
