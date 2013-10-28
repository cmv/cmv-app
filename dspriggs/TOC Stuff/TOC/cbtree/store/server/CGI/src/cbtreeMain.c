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
*	@date		08/01/2012
*
*	@version	1.1
*
*	History:
*
*		1.1		08/01/12	Removed handling of queries and sorting, removed the PCRE 
*							dependencies.
*		1.0		07/01/12	Initial release
*
****************************************************************************************
*
*	Description:
*
*		This file contains the main entry point for the Server Side CGI application
*		required to enable the dojo cbtree FileStore and is part of the github project
*		'cbtree'.
*
*		The cbtree FileStore CGI application is invoked by means of a HTTP GET, DELETE
*		or POST request, the basic ABNF format of a request looks like:
*
*			HTTP-request  ::= uri ('?' query-string)?
*			query-string  ::= (qs-param ('&' qs-param)*)?
*			qs-param	  ::= authToken | basePath | path | query | queryOptions | options 
*			authToken	  ::= 'authToken' '=' json-object
*			basePath	  ::= 'basePath' '=' path-rfc3986
*			path		  ::= 'path' '=' path-rfc3986
*			query-options ::= 'queryOptions' '=' json-object
*			options		  ::= 'options' '=' json-array
*
*		Please refer to http://json.org for the correct JSON encoding of the
*		parameters.
*
*		Please refer to http://datatracker.ietf.org/doc/rfc3875/ for the CGI Version 1.1
*		specification.
*
****************************************************************************************
*
*	QUERY-STRING Parameters:
* 
*		authToken:
*
*			The authToken parameter is a JSON object. There are no restrictions with
*			regards to the content of the object. (currently not used).
*
*		basePath:
*
*			The basePath parameter is a URI reference (rfc 3986) relative to the server's
*			document root used to compose the root directory as follows:
*
*				root-dir ::= document_root '/' basePath?
*
*		path:
*
*			The path parameter is used to specify a specific location relative to the
*			above mentioned root_dir. Therfore, the full search path is:
*
*				full-path = root_dir '/' path?
*
*		queryOptions:
*
*			The queryOptions parameter specifies a set of JSON 'property:value' pairs
*			used during the file search. Currently two properties are supported: "deep"
*			and "ignoreCase". Property deep indicates if a recursive search is required
*			whereas ignoreCase indicates if values are to be compared case insensitive/
*
*				queryOptions={"deep":true, "ignorecase":true}
*
*		options:
*
*			The options parameter is a JSON array of strings. Each string specifying a
*			search options to be enabled. Currently the following option is supported:
*			"showHiddenFiles".
*
*				options=["showHiddenFiles"]
*
****************************************************************************************
*
*	ENVIRONMENT VARIABLE:
*
*		CBTREE_BASEPATH
*
*			The basePath is a URI reference (rfc 3986) relative to the server's
*			document root used to compose the root directory.  If this variable
*			is set it overwrites the basePath parameter in any query string and
*			therefore becomes the server wide basepath.
*
*				CBTREE_BASEPATH /myServer/wide/path
*
*		CBTREE_METHODS
*
*			A comma separated list of HTTP methods to be supported by the Server
*			Side Application. By default only HTTP GET is supported. Example:
*
*				CBTREE_METHODS GET,DELETE
*
*	Notes:
*
*		-	Some HTTP servers require  special configuration to make environment
*			variables available to  script or CGI application.  For example, the
*			Apache HTTP servers requires you to either use the SetEnv or PassEnv 
*			directive. To make the environment variable CBTREE_METHODS available
*			add the following to your httpd.conf file:
*
*				SetEnv CBTREE_METHODS GET,DELETE
*							or
*				PassEnv CBTREE_METHODS
*
*			(See http://httpd.apache.org/docs/2.2/mod/mod_env.html for details).
*
****************************************************************************************
*
*	PERFORMACE:
*
*		If you plan on using the cbtreeFileStore on  large file systems with, for
*		example, a checkbox tree  that requires a strict parent-child elationship
*		it is highly recommended to use this ANSI-C implementation instead of the
*		PHP version.
*
*		To configure an Apache HTTP server for CGI support please refer to:
*
*			http://httpd.apache.org/docs/2.2/howto/cgi.html
*
*	NOTE:	When using this CGI implementation no PHP server support is required.
*
****************************************************************************************
*
*	SECURITY:
*
*		Some  basic security issues are addressed  by this implementation.   For example,
*		only HTTP requests allowed are served. Malformed QUERY-STRING parameters are NOT
*		skipped and  ignored, instead they will result  in a 'Bad Request' response  to
*		the server/client. Requests to access files above the server's document root are
*		rejected returning the HTTP forbidden response (403).
*
*	AUTHENTICATION:
*
*		This application does NOT authenticate the calling party however, it does test
*		for, and retreives, a 'authToken' paramter if present.
*
*	NOTE:	This implementation will not list any files starting with a dot like .htaccess
*			unless explicitly requested. However it will NOT process .htaccess files.
*			Therefore, it is the user's responsibility not to include any private or other
*			hidden files in the directory tree accessible to this application.
*
****************************************************************************************
*
*	RESPONSE:
*
*		Assuming a valid HTTP GET or DELETE request was received the response to
*		the client complies with the following ABNF notation:
*
*			response	  ::= '{' (totals ',')? (status ',')? file-list '}'
*			totals 		  ::= '"total"' ':' number
*			status		  ::= '"status"' ':' status-code
*			status-code	  ::=	'200' | '204' | '401'
*			file-list	  ::= '"items"' ':' '[' file-info* ']'
*			file-info	  ::= '{' name ',' path ',' size ',' modified ',' (',' directory)? 
*								(',' oldPath)? (',' children ',' expanded)? '}'
*			name		  ::= '"name"' ':' json-string
*			path		  ::= '"path"' ':' json-string
*			size		  ::= '"size"' ':' number
*			modified	  ::= '"modified"' ':' number
*			directory	  ::= '"directory"' ':' ('true' | 'false')
*			oldPath		  ::= '"oldPath"' ':' json-string
*			children	  ::= '[' file-info* ']'
*			expanded	  ::= '"_EX"' ':' ('true' | 'false')
*			quoted-string ::= '"' CHAR* '"'
*			number		  ::= DIGIT+
*			DIGIT		  ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
*
*	Notes:
*
*		-	The expanded property indicates if a deep search was performed on a 
*			directory. Therefore, if expanded is true and children is empty we
*			are dealing with an empty directory and not a directory that hasn't
*			been searched/expanded yet. The expanded property is typically used
*			when lazy loading the file store.
*
***************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "cbtreeArgs.h"
#include "cbtreeCGI.h"
#include "cbtreeURI.h"
#include "cbtreeJSON.h"
#include "cbtreeString.h"
#include "cbtreeFiles.h"
#include "cbtreeDebug.h"
#include "cbtree_NP.h"

#define	STORE_C_IDENTIFIER	"path"
#define STORE_C_LABEL		"name"

static char	cDbgServer[] = "d:/MyServer/html/";		// For debug purpose only.

extern FILE	*phResp;		// File handle output stream. (set by cgiInit() )

/**
*	main
*
*		Main entry point Common Gateway Interface (CGI) application.
*
**/
int main()
{
	ARGS	*pArgs = NULL;
	FILE_INFO	*pFileInfo;
	LIST	*pFileList;
	
	char	cDocRoot[MAX_PATH_SIZE]   = "",
			cRootDir[MAX_PATH_SIZE]   = "",
			cFullPath[MAX_PATH_SIZE]  = "",
			cTempPath[MAX_PATH_SIZE]   = "",
			cPath[MAX_PATH_SIZE]   = "",
			cPathEnc[MAX_PATH_SIZE*2] = "";			
	char	*pcResult;
	int		iMethod,
			iResult;
	
	cgiInit();		// Initialize the CGI environment.

#ifdef _DEBUG	// Inject some variables...
	varSet( cgiGetProperty("DOCUMENT_ROOT"), cDbgServer );
	varSet( cgiGetProperty("REQUEST_METHOD"), "GET" );
#endif

	// Get the HTTP method and validate if allowed.
	iMethod = cgiGetMethodId();
	if( !cgiMethodAllowed( iMethod ) )
	{
		cgiResponse( HTTP_V_METHOD_NOT_ALLOWED, NULL );
		cbtDebug( "Invalid method: %d", iMethod );
		return 0;
	}
	// Get the application specific arguments and options.
	if( !(pArgs = getArguments( &iResult )) )
	{
		switch( iResult )
		{
			case HTTP_V_BAD_REQUEST:
			case HTTP_V_SERVER_ERROR:
				cgiResponse( iResult, NULL );
				break;
			default:
				cgiResponse( iResult, "Undetermined error condition" );
				break;
		}
	}

	/*
		Compose and normalize the root directory and full path.   Any path is handled
		as a URI path as described in RFC 3986. The path argument in the QUERY-STRING
		must comply with either the path-absolute, path-noscheme or path-empty format.
		Any  pathname returned to  the caller is of  type  path-rootless, that is, it 
		begins with a non-colon segment (e.g no leading '/').
	*/
	if( varGet( cgiGetProperty( "DOCUMENT_ROOT" )) == NULL )
	{
		cgiResponse( HTTP_V_SERVER_ERROR, "CGI environment variables missing." );
		cbtDebug( "No DOCUMENT_ROOT available." );
		return 0;
	}
	snprintf( cDocRoot, sizeof(cDocRoot)-1, "%s", varGet( cgiGetProperty( "DOCUMENT_ROOT" )) );
	strtrim( normalizePath( cDocRoot ), (TRIM_M_WSP | TRIM_M_SLASH) );
	snprintf( cRootDir, sizeof(cRootDir)-1, "%s/%s", cDocRoot, (pArgs->pcBasePath ? pArgs->pcBasePath : "") );
	strtrim( normalizePath( cRootDir ), (TRIM_M_WSP | TRIM_M_SLASH) );

	snprintf( cTempPath, sizeof(cTempPath)-1, "./%s", pArgs->pcPath ? pArgs->pcPath : "" );
	snprintf( cPath, sizeof(cPath)-1, "./%s", normalizePath(cTempPath) );
	strtrim( cPath, TRIM_M_SLASH );
	
	snprintf( cFullPath, sizeof(cFullPath)-1, "%s/%s", cRootDir, cPath );
	strtrim( normalizePath( cFullPath ), TRIM_M_SLASH );

	// Make sure the caller is not backtracking by specifying paths like '../../../../'
	if( strncmp( cDocRoot, cRootDir, strlen(cDocRoot)) || strncmp( cRootDir, cFullPath, strlen(cRootDir)) )
	{
		cgiResponse( HTTP_V_FORBIDDEN, "We're not going there." );
		destroyArguments( &pArgs );
		cgiCleanup();
		return 0;
	}

	switch( iMethod )
	{
		case HTTP_V_DELETE:
			// Delete a file or directory
			if( (pFileList = getFile( cFullPath, cRootDir, pArgs, &iResult )) )
			{
				pFileInfo = pFileList->pNext->pvData;	// Get first entry in the list
				pFileList = removeFile( pFileInfo, cRootDir, pArgs, &iResult );

				if( pFileList )
				{
					if( (pcResult = jsonEncode(pFileList, 0)) )
					{
						fprintf( phResp, "Content-Type: text/json\r\n" );
						fprintf( phResp, "\r\n" );
						// Write the body
						fprintf( phResp, "{\"total\":%d,\"status\":%d,\"items\":%s}\r\n", 
								 fileCount(pFileList, false), iResult, pcResult );
						destroy( pcResult );
					}
					else
					{
						cgiResponse( HTTP_V_SERVER_ERROR, "JSON encoding failed" );
					}
					destroyFileList( &pFileList );	// Destroy list AND associated FILE_INFO.
				}
			}
			else
			{
				cgiResponse( iResult, NULL );
			}
			cbtDebug( "DELETE \"%s\" %d", cFullPath, iResult );
			break;

		case HTTP_V_GET:
			pFileList = getFile( cFullPath, cRootDir, pArgs, &iResult );
			if( pFileList )
			{
				iResult = listIsEmpty( pFileList ) ? HTTP_V_NO_CONTENT : HTTP_V_OK;

				if( (pcResult = jsonEncode(pFileList, 0)) )
				{
					// Write the header(s)
					fprintf( phResp, "Content-Type: text/json\r\n" );
					fprintf( phResp, "\r\n" );
					// Write the body
					fprintf( phResp, "{\"total\":%d,\"status\":%d,\"items\":%s}\r\n", 
							 fileCount(pFileList, false), iResult, pcResult );
					destroy( pcResult );
				}
				else
				{
					cgiResponse( HTTP_V_SERVER_ERROR, "JSON encoding failed" );
				}
				destroyFileList( &pFileList );	// Destroy list AND associated FILE_INFO.
			}
			else
			{
				if( iResult != HTTP_V_NOT_FOUND )
				{
					fprintf( phResp, "Content-Type: text/json\r\n" );
					fprintf( phResp, "\r\n" );

					fprintf( phResp, "{\"total\":0,\"status\":%d,\"items\":[]}\r\n", iResult );
				}
				else
				{
					// Don't give away more than is needed....
					encodeReserved( pArgs->pcBasePath, cPathEnc, sizeof(cPathEnc)-1 );
					cgiResponse( HTTP_V_NOT_FOUND, "Invalid path and/or basePath" );
				}
			}
			break;

		case HTTP_V_POST:
			pFileList = renameFile( cFullPath, cRootDir, pArgs, &iResult );
			if( pFileList )
			{
				if( (pcResult = jsonEncode(pFileList, 0)) )
				{
					fprintf( phResp, "Content-Type: text/json\r\n" );
					fprintf( phResp, "\r\n" );
					// Write the body
					fprintf( phResp, "{\"total\":%d,\"status\":%d,\"items\":%s}\r\n", 
							 fileCount(pFileList, false), iResult, pcResult );
					destroy( pcResult );
				}
				else
				{
					cgiResponse( HTTP_V_SERVER_ERROR, "JSON encoding failed" );
				}
				destroyFileList( &pFileList );	// Destroy list AND associated FILE_INFO.
			}
			else
			{
				cgiResponse( iResult, NULL );
			}
			cbtDebug( "POST [%s] > [%s]", cFullPath, pArgs->pcNewValue );
			break;
	}
	// The END
	destroyArguments( &pArgs );
	cgiCleanup();
	return 0;
}
