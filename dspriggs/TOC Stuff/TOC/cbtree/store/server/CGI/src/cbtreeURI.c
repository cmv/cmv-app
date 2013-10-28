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
*		This module provides the functionality to encode and decode URI's in
*		compliance with RFC 3986.
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#include "cbtreeCommon.h"
#include "cbtreeString.h"
#include "cbtreeURI.h"

#define MIN(x,y) (x < y ? x : y)
/**
*	decodeURI
*
*		Decode a URI encoded string into a ISO-8859-1 (ASCII) string. Any percent (%) 
*		encode character is translated to its ASCII equivalent.
*
*	@param	pcSrc			Address URI encode C-string
*	@param	pcDst			Address destination (output) buffer
*	@param	iDstLen			Length destination string
*
*	@return		Address destination C-string.
*/
char *decodeURI( char *pcSrc, char *pcDst, size_t iDstLen )
{
	char	*pcDecode = pcSrc,
				*pNext;
	char	hex[3] = { '\0', '\0', '\0' };
	int		lValue;
	size_t	iSrcLen;

	if( pcSrc )
	{
		iSrcLen  = strlen(pcSrc);
		if( pcDst )
		{
			if( iSrcLen < iDstLen )
			{
				memmove( pcDst, pcSrc, iSrcLen+1 );
				pcDecode = pcDst;
			}
			else
				return NULL;
		}
		else
			pcDst = pcSrc;

		while( (pcDecode = strchr( pcDecode, '%' )) )
		{
			hex[0] = pcDecode[1]; 
			hex[1] = pcDecode[2];
			if( (lValue = strtol( hex, NULL, 16 )) )
			{
				*pcDecode++ = (unsigned char)lValue;
				pNext = pcDecode + 2;
				memmove( pcDecode, pNext, strlen( pNext ) + 1);
			}
			else
				pcDecode++;
		}
		return pcDst;
	}
	return NULL;
}

/**
*	encodeReserved
*
*		Strict enocding of a non URI character string. Any character not part of the unreserved
*		URI character set will be percent encoded. This routine is typically used to encode any
*		'reserved' URI characters.
*
*		NOTE:	Do NOT use this routine on a complete URI as it will encode all reserved
*				characters and as a result will lose their 'special' meaning.
*
*				Under normal circumstances, the only time when octets within a URI are 
*				percent-encoded is during the process of producing the URI from its 
*				component parts. This is when an implementation determines which of the
*				reserved characters are to be used as subcomponent delimiters and which 
*				can be safely used as data.
*				Once produced, a URI is always in its percent-encoded form.
*
*	@param	pcSrc			Address source C-string
*	@param	pcDst			Address destination (output) buffer
*	@param	iDstLen			Length destination string
*
*	@return		Address destination C-string.
*/
char *encodeReserved( const char *pcSrc, char *pcDst, size_t iDstLen )
{
	char	*s = pcDst;
	size_t	iSrcLen;
	int		iDiff;
	
	if( pcDst && iDstLen > 0 ) 
	{
		if( pcSrc )
		{
			iSrcLen = strlen( pcSrc );
			iDiff   = iDstLen - iSrcLen; 
			if( iDiff >= 0 )
			{
				memmove( pcDst, pcSrc, iSrcLen + 1);
				while( *s && iDiff )
				{
					if( !isalnum( (unsigned char)*s ) && !strchr( "-._~", *s ) )
					{
						if( iDiff >= 2 )
						{
							memmove( s + 3, s + 1, strlen( s+1 ) + 1 );	// include terminating zero
							snprintf( s, 3, "%%%02X", (int)*s );
							iDiff -= 2;
						}
						else
						{
							return NULL;
						}
					}
					s++;
				} /* End while */
			}
			else
			{
				return NULL;
			}
		}
		return pcDst;
	}
	return NULL;
}

/**
*	parsePath
*
*	@param	pcPath			Address of Path string
*	@param	iDirSize
*	@param	ppcDirectory
*	@param	iFnamSize
*	@param	ppcFilename
*
*	@return		Address C-string containing the directory (*ppcDirectory)
**/
char *parsePath( char *pcPath, size_t iDirSize, char **ppcDirectory, size_t iFnamSize, char **ppcFilename )
{
	char	cDirectory[MAX_PATH_SIZE],
			cFilename[MAX_PATH_SIZE];
	char	*pcSep;
	
	if( ppcDirectory && *ppcDirectory )
	{
		*(*ppcDirectory) = '\0';
		if( pcPath && *pcPath );
		{
			if( (pcSep = strrchr(pcPath,'/')) )
			{
				strncpyz( cDirectory, pcPath, MIN( (pcSep-pcPath), sizeof(cDirectory)-1));
				strncpyz( cFilename, ++pcSep, sizeof(cFilename)-1);
			}
			else
			{
				strncpyz( cFilename, ++pcSep, sizeof(cFilename)-1);
			}
		}
		strncpyz( *ppcDirectory, cDirectory, iDirSize );
		if( ppcFilename && *ppcFilename) 
		{
			strncpyz( *ppcFilename, cFilename, iFnamSize );
		}
		return *ppcDirectory;
	}
	return NULL;
}

/**
*	pathToUnix
*
*		Convert a DOS pathname string into a UNIX style path string converting all
*		backward slashes into forward slashes.
*
*	@param	pcPath			Address of Path string
*
*	@return		pcPath
*/
char *pathToUnix( char *pcPath )
{
	char *pcBwdSlash = pcPath;
	
	if( pcPath )
	{
		while( (pcBwdSlash = strchr( pcBwdSlash, '\\' )) ) *pcBwdSlash = '/';
	}
	return pcPath;
}

/**
*	removeDotSegments
*
*		Removes the  special "." and ".." complete path segments  from a URI in 
*		order to remove any invalid or extraneous dot-segments prior to forming
*		the target URI.
*
*	@param	pcPath			Address C-string containing the path
*
*	@see	rfc3986 $5.2.4
*
*	@return		pcPath or NULL
**/
char *removeDotSegments( char *pcPath )
{
	char	cBuffer[MAX_BUF_SIZE] = "";
	char	*d = cBuffer,
			*s = pcPath;
			
	if( pcPath )
	{
		if( strlen( pcPath ) >= sizeof(cBuffer) )
		{
			return NULL;
		}
		while( *s )
		{
		/*
			A.	If the input buffer begins with a prefix of "../" or "./",
				then remove that prefix from the input buffer; otherwise,
		*/
			if( !strncmp( s, "./", 2 ) )
			{
				memmove( s, s+2, strlen( s+2 ) + 1 );
				continue;
			}
			if( !strncmp( s, "../", 3 ) )
			{
				memmove( s, s+3, strlen( s+3 ) + 1 );
				continue;
			}
		/*
			B.	if the input buffer begins with a prefix of "/./" or "/.",
				where "." is a complete path segment, then replace that
				prefix with "/" in the input buffer; otherwise,			
		*/
			if( !strcmp( s,"/." ) )
			{
				s[1] = '\0';
			}
			if( !strncmp( s,"/./", 3 ) )
			{
				memmove( s, s+2, strlen( s+2 ) + 1 );
				continue;
			}
		/*
			C.	if the input buffer begins with a prefix of "/../" or "/..",
				where ".." is a complete path segment, then replace that
				prefix with "/" in the input buffer and remove the last
				segment and its preceding "/" (if any) from the output
				buffer; otherwise,
		*/
			if( !strcmp( s,"/.." ) )
			{
				s[1] = '\0';
				if( !(d = strrchr( cBuffer,'/' )) )
				{
					d = cBuffer;
				}
				*d = '\0';
				continue;
			}
			if( !strncmp( s,"/../", 4 ) )
			{
				memmove( s, s+3, strlen( s+3 ) + 1 );
				if( !(d = strrchr( cBuffer,'/' )) )
				{
					d = cBuffer;
				}
				*d = '\0';
				continue;
			}
		/*
			D.	if the input buffer consists only of "." or "..", then remove
				that from the input buffer; otherwise,			
		*/
			if( !strcmp( pcPath,"." ) || !strcmp( pcPath, ".." ) )
			{
				*pcPath = '\0';
				return pcPath;
			}
		/*
			E.	move the first path segment in the input buffer to the end of
				the output buffer, including the initial "/" character (if
				any) and any subsequent characters up to, but not including,
				the next "/" character or the end of the input buffer.			
		*/
			*d++ = *s++;
			while( *s && *s != '/' ) *d++ = *s++;
			*d = '\0';
		}
		return strcpy( pcPath, cBuffer );
	}
	return NULL;
}

/**
*	removeEmptySegments
*
*		Remove any empty segments from a path string, that is, replace any double
*		forward slash (//) with a single forward slash (/)
*
*	@param	pcPath			Address C-string containing the path
*
*	@return		Address modified path string (pcPath).
**/
char *removeEmptySegments( char *pcPath )
{
	char	*es = pcPath;
	
	if( pcPath && *pcPath )
	{
		while( (es = strchr( es,'/' )) )
		{
			if( *(es+1) == '/' )
			{
				memmove( es, (es+1), strlen(es) );
				continue;
			}
			es++;
		}
	}
	return pcPath;
}

/**
*	normalizePath
*
*		Normalize a URI path string. The normalization include the following steps:
*
*		- Replace backward slashes with forward slashes.
*		- Remove empty segments
*		- Remove dot segments according to RFC 3986 $5.2.4
*
*	@param	pcPath			Address C-string containing the path
*
*	@return		Address modified path string (pcPath).
**/
char *normalizePath( char *pcPath )
{
#ifdef WIN32
	pathToUnix( pcPath );
#endif
	return removeDotSegments( removeEmptySegments( pcPath ) );
}
