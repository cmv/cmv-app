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
*		This module provides the functionality to establish, query and maintain
*		the internal CGI environment. After the successful completion of the CGI
*		initialization phase the environment hold two PHP like 'global' variable:
*
*			_SERVER		(php: $_SERVER)
*			_GET		(php: $_GET) 
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "cbtreeCommon.h"
#include "cbtreeDebug.h"
#include "cbtreeCGI.h"
#include "cbtreeURI.h"
#include "cbtreeString.h"

// Declare list of possible HTTP methods and their symbolic values.
static METHOD	httpMethods[] = {
		{ HTTP_V_OPTIONS,	"OPTIONS",	false },
		{ HTTP_V_GET,		"GET",		true },		// Allowed by default
		{ HTTP_V_HEAD,		"HEAD",		false },
		{ HTTP_V_POST,		"POST",		false },
		{ HTTP_V_PUT,		"PUT",		false },
		{ HTTP_V_DELETE,	"DELETE",	false },
		{ HTTP_V_TRACE,		"TRACE",	false },
		{ HTTP_V_CONNECT,	"CONNECT",	false },
		{ 0, NULL, false }
	};

// Declare list of possible HTTP status codes and reason phrases.
static STATUS	httpStatus[] = {
		{ HTTP_V_OK,					200, "OK" },
		{ HTTP_V_NO_CONTENT,			204, "No Content" },
		{ HTTP_V_BAD_REQUEST,			400, "Bad Request" },
		{ HTTP_V_UNAUTHORIZED,			401, "Unauthorized" },
		{ HTTP_V_FORBIDDEN,				403, "Forbidden" },
		{ HTTP_V_NOT_FOUND,				404, "Not Found" },
		{ HTTP_V_METHOD_NOT_ALLOWED,	405, "Method Not Allowed" },
		{ HTTP_V_CONFLICT,				409, "Conflict" },
		{ HTTP_V_GONE,					410, "Gone" },
		{ HTTP_V_SERVER_ERROR,			500, "Internal Server Error" },
		{ 0, 0, NULL }
	};

// Declare list of possible CGI varaible. (availability depends on the HTTP server).
static const char *cgiVarNames[] = { 
	"AUTH_TYPE",
	"CONTENT_LENGTH",
	"CONTENT_TYPE",
	"DOCUMENT_ROOT",
	"GATEWAY_INTERFACE",
	"PATH_INFO",
	"PATH_TRANSLATED",
	"QUERY_STRING",
	"REMOTE_ADDR",
	"REMOTE_HOST",
	"REMOTE_IDENT",
	"REMOTE_PORT",
	"REMOTE_USER",
	"REQUEST_METHOD",
	"REQUEST_URI",
	"SCRIPT_NAME",
	"SCRIPT_FILENAME",
	"SERVER_ADMIN",
	"SERVER_NAME",
	"SERVER_PORT",
	"SERVER_PROTOCOL",
	"SERVER_SIGNATURE", 
	"SERVER_SOFTWARE", 
	"HTTP_ACCEPT",
	"HTTP_ACCEPT_ENCODING",
	"HTTP_ACCEPT_LANGUAGE",
	"HTTP_COOKIE",
	"HTTP_FORWARDED",
	"HTTP_HOST",
	"HTTP_PRAGMA",
	"HTTP_REFERER",
	"HTTP_USER_AGENT",
	NULL
	};

// Declare CBTREE specific configuration variables
static const char *cgiCbtreeNames[] = { 
	"CBTREE_BASEPATH",
	"CBTREE_METHODS",
	NULL
	};


static DATA *cgiEnvironment = NULL;

FILE	*phResp = NULL;

#ifdef _DEBUG
// When debuging use cDbgQS to inject a QUERY-STRING.
//char	cDbgQS[] = "basePath=%2Fjs%2Fdojotoolkit%2Fcbtree";
char	cDbgQS[] = "basePath=%2FLogs&path=./markdown/test";
#endif

/**
*	_cgiGetMethodById
*
*		Returns the address of a HTTP method declaration based on the method ID
*
*	@return		Address METHOD.
**/
METHOD * _cgiGetMethodById( int iMethod )
{
	int		i;
	
	for( i = 0; httpMethods[i].pcMethod; i++ )
	{
		if( httpMethods[i].iSymbolic == iMethod )
		{
			return &httpMethods[i];
		}
	}	
	return NULL;
}

/**
*	_cgiGetMethodByName
*
*		Returns the address of a HTTP method declaration based on the method name.
*
*	@return		Address METHOD.
**/
METHOD * _cgiGetMethodByName( char *pcMethod )
{
	int		i;
	
	for( i = 0; httpMethods[i].pcMethod; i++ )
	{
		if( !strcmp( pcMethod, httpMethods[i].pcMethod ) )
		{
			return &httpMethods[i];
		}
	}	
	return NULL;
}

/**
*	_cgiGetStatus
*
*		Returns the address of the STATUS struct associated with the symbolic value
*		iStatus.
*
*	@param	iStatus			Integer symbolic value of an HTTP status code.
*
*	@return		Address STATUS struct or NULL
**/
static STATUS * _cgiGetStatus( int iStatus )
{
	int	i;
	
	for( i=0; httpStatus[i].pcReason; i++ )
	{
		if( httpStatus[i].iSymbolic == iStatus )
		{
			return & httpStatus[i];
		}
	}
	return NULL;
}

/**
*	cgiCleanup
*
*		Destroy the CGI environment and close the log file.
**/
void cgiCleanup()
{
	destroy( cgiEnvironment );
	cbtDebugEnd();
	
	cgiEnvironment = NULL;
}

/**
*	cgiInit
*
*		Load the available CGI variables and create the PHP style _SERVER and _GET
*		dynamic variables. Both variables are created as associative arrays.
**/
int cgiInit()
{
	METHOD	*pMethod;
	DATA	*ptContent,
			*ptQuery,
			*ptArgs,
			*ptSERVER,
			*ptCBTREE,
			*ptGET,
			*ptPOST;
	char	cProperty[MAX_BUF_SIZE],
			cValue[MAX_BUF_SIZE],
			cArgm[MAX_BUF_SIZE],
			*pcAllowed,
			*pcSrc,
			*pcArgm;
	int		iArgCount,
			iSep,
			i;
	
	phResp = stdout;
	
	cgiEnvironment = newArray(NULL);

	// Setup a PHP style '$_SERVER' variable.
	if( (ptSERVER = newArray( "_SERVER" )) )
	{
		for( i=0; cgiVarNames[i]; i++)
		{
			varNewProperty( cgiVarNames[i],  getenv(cgiVarNames[i]), ptSERVER );
		}
		varPush( cgiEnvironment, ptSERVER );
	}

	/**
	*	 Setup a PHP style '$_CBTREE' variable.
	*
	*	NOTE:	On Apache HTTP servers any non CGI variables must be passed explicitly
	*			using the 'SetEnv' or 'PassEnv' directive. For example in httpd.conf
	*			add:
	*
	*				PassEnv CBTREE_METHODS
	**/
	if( (ptCBTREE = newArray( "_CBTREE" )) )
	{
		for( i=0; cgiCbtreeNames[i]; i++)
		{
			varNewProperty( cgiCbtreeNames[i],  getenv(cgiCbtreeNames[i]), ptCBTREE );
		}
		varPush( cgiEnvironment, ptCBTREE );
	}
	
#ifdef _DEBUG
	varSet( cgiGetProperty("QUERY_STRING"), cDbgQS );
#endif

	switch( cgiGetMethodId() )
	{
		case HTTP_V_DELETE:
		case HTTP_V_GET:
			if( (ptGET = newArray( "_GET" )) )
			{
				if( (ptQuery = cgiGetProperty("QUERY_STRING")) )
				{
					// Get the list of HTTP query arguments as a new array.
					ptArgs = varSplit( ptQuery, "&", false );
					ptGET  = newArray( "_GET" );
					if( (iArgCount = varCount( ptArgs )) )
					{
						for( i=0; i < iArgCount; i++ )
						{
							if( (pcArgm = varGet(varGetByIndex( i, ptArgs ))) )
							{
								// Decode special characters and treat each argument as a new property.
								pcSrc  = decodeURI( pcArgm, cArgm, sizeof(cArgm)-1 );
								iSep   = strcspn( pcSrc, "=" );
								strncpyz( cProperty, pcSrc, iSep );
								pcSrc += pcSrc[iSep] ? iSep + 1: iSep;
								strcpy( cValue, pcSrc );
								
								varNewProperty( cProperty, cValue, ptGET );
							}
						}
					}
					destroy( ptArgs );
				}
				varPush( cgiEnvironment, ptGET );
			}
			break;
			
		case HTTP_V_POST:
			if( (ptPOST = newArray( "_POST" )) )
			{
				// Read the content from stdin
				if( fgets(cArgm, sizeof(cArgm)-1, stdin) )
				{
					ptContent = newString( "CONTENT", cArgm );
					ptArgs	  = varSplit( ptContent, "&", false );
					if( (iArgCount = varCount( ptArgs )) )
					{
						for( i=0; i < iArgCount; i++ )
						{
							if( (pcArgm = varGet(varGetByIndex( i, ptArgs ))) )
							{
								// Decode special characters and treat each argument as a new property.
								pcSrc  = decodeURI( pcArgm, cArgm, sizeof(cArgm)-1 );
								iSep   = strcspn( pcSrc, "=" );
								strncpyz( cProperty, pcSrc, iSep );
								pcSrc += pcSrc[iSep] ? iSep + 1: iSep;
								strcpy( cValue, pcSrc );
								
								varNewProperty( cProperty, cValue, ptPOST );
							}
						}
					}
					destroy( ptArgs );
				}
				varPush( cgiEnvironment, ptPOST );
			}
			break;
	}
	// Define which HTTP methods are allowed.
	if( ptCBTREE )
	{
		pcAllowed = varGet(varGetProperty("CBTREE_METHODS", ptCBTREE));
		snprintf( cProperty, sizeof(cProperty)-1,"GET,%s", (pcAllowed ? pcAllowed : "") );
		pcArgm = strtok( cProperty, ", " );
		while( pcArgm )
		{
			strtrim( pcArgm, TRIM_M_WSP );
			if( *pcArgm )
			{
				if( (pMethod = _cgiGetMethodByName( pcArgm )) )
				{
					pMethod->bAllowed = true;
				}
			}
			pcArgm = strtok( NULL, ", " );
		}
	}
	return 1;
}

/**
*	cgiGetProperty
*
*		Returns a pointer to a CGI variable/property. At first the 'global' CGI
*		variable list is checked, if no match is found the _SERVER variable is
*		checked for a matching property name.
*
*	@param	pcProperty		Address C-string containing the variable name.
*
*	@return		Pointer to the DATA struct associated with the variable or NULL
*				if no match was found.
**/
DATA *cgiGetProperty( char *pcProperty )
{
	char	cProperty[255];
	DATA	*ptProperty;
		
	if( cgiEnvironment && (pcProperty && *pcProperty) )
	{
		if( !(ptProperty = varGetProperty( pcProperty, cgiEnvironment )) )
		{
			snprintf( cProperty, sizeof(cProperty)-1, "_SERVER.%s", pcProperty );
			return varGetProperty( cProperty, cgiEnvironment );
		}
		return ptProperty;
	}
	return NULL;
}

/**
*	cgiGetMethodId
*
*		Returns the symbolic value of the HTTP method used to invoke this application.
*
*	@return		Integer HTTP method id.
**/
int cgiGetMethodId()
{
	METHOD	*pMethod;
	char	*pcMethod;

 	if( (pcMethod = getenv("REQUEST_METHOD" )) )
	{
		if( (pMethod = _cgiGetMethodByName(pcMethod)) )
		{
			return pMethod->iSymbolic;
		}
	}
	return HTTP_V_UNKNOWN;
}

/**
*	cgiMethodAllowed
*
*		Returns true if the HTTP method identified by iMethod is valid and allowed.
*
*	@param	iMethod			Integer value identifying a HTTP method.
*
*	@return		true or false
**/
bool cgiMethodAllowed( int iMethod ) 
{
	METHOD	*pMethod;
	
	if( (pMethod = _cgiGetMethodById(iMethod)) )
	{
		return pMethod->bAllowed;
	}
	return false;
}

/**
*	cgiResponse
*
*		Send a response back to the server. If parameter iStatus is an
*		unknown symbolic value, HTTP_V_SERVER_ERROR is used instead.
*
*	@param	iStatus			Symbolic HTTP Status code
*	@param	pcText			Address C-string optional text message.
**/
void cgiResponse( int iStatus, char *pcText )
{
	STATUS	*pStatus = _cgiGetStatus( iStatus );
	
	fprintf( phResp, "Content-Type: text/html\r\n" );
	if( pStatus )
	{
		fprintf( phResp, "Status: %d %s\r\n", pStatus->iStatusCode, pStatus->pcReason ); 
	}
	else
	{
		cgiResponse( HTTP_V_SERVER_ERROR, pcText );
		return;
	}
	fprintf( phResp, "\r\n" );		// Empty line between headers and body (REQUIRED).
	if( pcText && *pcText )
	{
		fprintf( phResp, "%s\r\n", pcText );
	}
}

