#ifndef __CBTREE_STRING_H__
#define __CBTREE_STRING_H__

#include <string.h>

#include "cbtreeTypes.h"

#define TRIM_M_LWSP				  1
#define TRIM_M_RWSP				  2
#define TRIM_M_WSP				  3
#define TRIM_M_SLASH			  4
#define TRIM_M_COLLAPSE			  8
#define TRIM_M_WSP_TO_SP		 16
#define TRIM_M_CRLF_TO_LF		 32
#define TRIM_M_QUOTES			 64
#define TRIM_M_QUOTES_RECUR		192

#ifdef __cplusplus
	extern "C" {
#endif

bool isBoolean( char *pcSrc, bool *pbValue );
bool isNumeric( char *pcSrc, long *plValue );
bool isQuoted( char *s );

char *mstrncpy( const char *src, size_t len );
char *mstrcpy( const char *src );

char *strcap( char *src );
int strcpair( char *src, int iLvalue, int iRvalue );
char *strfchr( char *src );
char *strncpyz( char *dst, const char *src, size_t len );
char *strpair( char *src, int iLvalue, int iRvalue );
char *strtrim( char *src, int flag );

#ifdef __cplusplus
	}
#endif

#endif /* __CBTREE_STRING_H__ */
