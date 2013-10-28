#ifndef __CBTREE_CGI_H__
#define __CBTREE_CGI_H__

#include "cbtreeTypes.h"

#define HTTP_V_UNKNOWN		0x00
#define HTTP_V_OPTIONS		0x01
#define HTTP_V_GET			0x02
#define HTTP_V_HEAD			0x03
#define HTTP_V_POST			0x04
#define HTTP_V_PUT			0x05
#define HTTP_V_DELETE		0x06
#define HTTP_V_TRACE		0x07
#define HTTP_V_CONNECT		0x08

typedef struct httpMethod {
	const int	iSymbolic;
	const char	*pcMethod;
	bool		bAllowed;
	} METHOD;

typedef struct httpStatus {
	const int	iSymbolic;
	const int	iStatusCode;
	const char	*pcReason;
	} STATUS;

#ifdef __cplusplus
	extern "C" {
#endif
		
void  cgiCleanup();
int   cgiGetMethodId();
DATA *cgiGetProperty( char *pcVarName );
int   cgiInit();
bool  cgiMethodAllowed( int iMethod );
void  cgiResponse( int iStatus, char *pcText );

#ifdef __cplusplus
	}
#endif

#endif /* __CBTREE_CGI_H__ */
