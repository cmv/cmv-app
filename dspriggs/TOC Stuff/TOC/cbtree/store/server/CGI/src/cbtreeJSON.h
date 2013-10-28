#ifndef _CBTREE_JSON_H_
#define _CBTREE_JSON_H_

#include "cbtreeCommon.h"
#include "cbtreeFiles.h"

#define JSON_M_ENCODE_ITEM			1
#define JSON_M_ENCODE_ARRAY			2
#define JSON_M_INCLUDE_ICON		   16

#ifdef __cplusplus
	extern "C" {
#endif

DATA *jsonDecode( void *pvData );

char *jsonEncode( LIST *pFileInfo, int imFlags );

#ifdef __cplusplus
	}
#endif

#endif /* _CBTREE_JSON_H_ */
