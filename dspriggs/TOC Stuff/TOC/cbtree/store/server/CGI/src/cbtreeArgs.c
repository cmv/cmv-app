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
*		This module provides all the functionality to process the HTTP QUERY-STRING
*		parameters. The processing of any parameter takes place AFTER the internal
*		CGI environment is established and uses a set of PHP like functions.
*
*		See modules cbtreeCGI.c and cbtreeTypes.c for additional information.
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>

#include "cbtreeArgs.h"
#include "cbtreeCGI.h"
#include "cbtreeDebug.h"
#include "cbtreeFiles.h"
#include "cbtreeJSON.h"
#include "cbtreeString.h"

/**
*	_getOptionArgs
*
*		Returns the address of an OPTIONS struct with all supported options decoded. 
*		Two types of optional parameters are supported, that is, 'queryOptions' and
*		'options'.
*
*			query-options	:== 'queryOptions' '=' '{' (object (',' object)*))? '}'
*			options			:== 'options' '=' '[' (string (',' string)*)? ']'
*			object			:== '{' (property (',' property)*)? '}'
*			property		:== string ':' value
*			array			:== '[' (value (',' value)*)? ']'
*			value			:== string | number | object | array | 'true' | 'false'
*			string			:== '"' char* '"'
*
*		Example:
*
*			queryOptions={"deep":true, "ignoreCase":false}
*			options=["dirsOnly", "showHiddenFiles"]
*
*	@note:	Strict JSON encoding rules are enforced when decoding parameters.
*
*	@param	pGET			Address of a variable data type. (php style $_GET variable)
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_BAD_REQUEST or HTTP_V_SERVER_ERROR
*
*	@return		On success the address of an OPTIONS struct otherwise NULL
**/
static OPTIONS * _getOptionArgs( DATA *pGET, int *piResult )
{
	OPTIONS	*pOptions;
	DATA	*ptQueryOptions,
			*ptOptions;
			
	if( (pOptions = (OPTIONS *)calloc(1, sizeof(OPTIONS))) )
	{
		if( hasProperty( "options", pGET ) )
		{
			if( (ptOptions = jsonDecode( varGetProperty("options", pGET))) )
			{
				pOptions->bShowHiddenFiles = varInArray("showHiddenFiles", ptOptions);
				pOptions->bDebug		   = varInArray("debug", ptOptions);

				destroy( ptOptions );
			}
			else // Ill formatted JSON array
			{
				cbtDebug( "options parameter is not a valid JSON object." );
				*piResult = HTTP_V_BAD_REQUEST;
				destroy( pOptions );
				return NULL;
			}
		}

		if( hasProperty( "queryOptions", pGET ) )
		{
			if( (ptQueryOptions = jsonDecode( varGetProperty("queryOptions", pGET))) )
			{
				pOptions->bIgnoreCase = (bool)varGet( varGetProperty("ignoreCase", ptQueryOptions) );
				pOptions->bDeep		  = (bool)varGet( varGetProperty("deep", ptQueryOptions) );
				destroy( ptQueryOptions );
			}
			else // Ill formatted JSON object
			{
				cbtDebug( "queryOptions parameter is not a valid JSON object." );
				*piResult = HTTP_V_BAD_REQUEST;
				destroy( pOptions );
				return NULL;
			}
		}
		*piResult = HTTP_V_OK;	// Success
	}
	else // Out of memory...
	{
		*piResult = HTTP_V_SERVER_ERROR;
	}
	return pOptions;
}

/**
*	destroyArguments
*
*		Release all resources associated with a struct of type ARGS
*
*	@param	ppArgs			Address of a pointer of type ARGS
**/
void destroyArguments( ARGS **ppArgs )
{
	if( ppArgs && *ppArgs )
	{
		destroy( (*ppArgs)->pOptions );
		destroy( *ppArgs );
		*ppArgs = NULL;
	}
}

/**
*	getArguments
*
*		Returns the address of an ARGS struct with all HTTP query string parameters
*		extracted and decoded. The query string parameters (args) supported are:
*
*			query-string  ::= (qs-param ('&' qs-param)*)?
*			qs-param	  ::= authToken | basePath | path | query | queryOptions | options | 
*							  start | count |sort
*			authToken	  ::= 'authToken' '=' json-object
*			basePath	  ::= 'basePath' '=' path-rfc3986
*			path		  ::= 'path' '=' path-rfc3986
*			query		  ::= 'query' '=' object
*			query-options ::= 'queryOptions' '=' object
*			options		  ::= 'options' '=' array
*			start		  ::= 'start' '=' number
*			count		  ::= 'count' '=' number
*			sort		  ::= 'sort' '=' array
*
*	@note:	All of the above parameters are optional.
*
*	@param	piResult		Address integer receiving the final result code:
*							HTTP_V_OK, HTTP_V_BAD_REQUEST or HTTP_V_SERVER_ERROR
*
*	@return		On success the address of an ARGS struct otherwise NULL
**/
ARGS *getArguments( int *piResult )
{
	ARGS	*pArgs;
	DATA	*pCBTREE = NULL;
	DATA	*ptARGS = NULL,
			*ptArg;
	int		iResult = HTTP_V_OK;	// Assume success
	
	if( (pArgs = (ARGS *)calloc(1, sizeof(ARGS))) )
	{
		pCBTREE = cgiGetProperty("_CBTREE");	// Get CBTREE environment variables.
		switch( cgiGetMethodId() ) 
		{
			case HTTP_V_DELETE:
				if( (ptARGS = cgiGetProperty( "_GET" )) )
				{
					if( !hasProperty("path", ptARGS) )
					{
						iResult = HTTP_V_BAD_REQUEST;
					}
				}
				pArgs->pOptions = _getOptionArgs( NULL, &iResult ); 
				break;
				
			case HTTP_V_GET:
				if( (ptARGS = cgiGetProperty( "_GET" )) )
				{
					// Parse the general options, if any..
					if( !(pArgs->pOptions = _getOptionArgs( ptARGS, &iResult )) )
					{
						destroyArguments( &pArgs );
						return NULL;
					}
				}
				else // No QUERY-STRING
				{
					// We need at least an empty options struct.
					pArgs->pOptions = _getOptionArgs( NULL, &iResult ); 
				}
				break;

			case HTTP_V_POST:
				if( (ptARGS = cgiGetProperty( "_POST" )) )
				{
					if( hasProperty("newValue", ptARGS) &&
						hasProperty("path", ptARGS) )
					{
						ptArg = varGetProperty("newValue", ptARGS);
						if( isString(ptArg) )
						{
							pArgs->pcNewValue = varGet( ptArg );
						}
						else
						{
							iResult = HTTP_V_BAD_REQUEST;
						}
					}
					else // Missing parameter
					{
						iResult = HTTP_V_BAD_REQUEST;
					}
				}
				else // _POST is missing
				{
					iResult = HTTP_V_BAD_REQUEST;
				}
				pArgs->pOptions = _getOptionArgs( NULL, &iResult ); 
				break;
		}

		if( iResult == HTTP_V_OK )
		{		
			// Get and validate the basePath if any.
			pArgs->pcBasePath = varGet(varGetProperty("CBTREE_BASEPATH", pCBTREE));
			if( !pArgs->pcBasePath )
			{
				if((ptArg = varGetProperty("basePath", ptARGS)) )
				{
					if( isString(ptArg) )
					{
						pArgs->pcBasePath = strtrim(varGet( ptArg ), TRIM_M_QUOTES);
					}
					else
					{
						iResult = HTTP_V_BAD_REQUEST;
					}
				}
			}
			// Validate the path if any.
			if( (ptArg = varGetProperty("path", ptARGS)) )
			{
				if( isString(ptArg) )
				{
					pArgs->pcPath = strtrim(varGet( ptArg ), TRIM_M_QUOTES);
				}
				else
				{
					iResult = HTTP_V_BAD_REQUEST;
				}
			}
			if( hasProperty( "authToken", ptARGS ) )
			{
				if( (ptArg = jsonDecode(varGetProperty("authToken", ptARGS))) && isObject(ptArg) )
				{
					pArgs->pAuthToken = ptArg;
				}
				else
				{
					cbtDebug( "authToken parameter is not a valid JSON object" );
					iResult = HTTP_V_BAD_REQUEST;
				}
			}
		}
		if( iResult != HTTP_V_OK )
		{
			destroyArguments( &pArgs );
			*piResult = iResult;
			return NULL;
		}
		*piResult = HTTP_V_OK;

	}
	else  // Out of memory
	{
		*piResult = HTTP_V_SERVER_ERROR;
	}
	return pArgs;
}
