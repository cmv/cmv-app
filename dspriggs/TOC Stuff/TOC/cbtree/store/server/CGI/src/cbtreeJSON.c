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
*		This module provides all the functionality to decode and encode JSON.
*
*		Please refer to http://json.org/ for the JSON encoding rules.
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
#include "cbtreeJSON.h"
#include "cbtreeList.h"
#include "cbtreeString.h"

static bool _jsonIsArray( char *pcSrc, char **ppcNext );
static bool _jsonIsBoolean( char *pcSrc, char **ppcNext );
static bool _jsonIsNull( char *pcSrc, char **ppcNext );
static bool _jsonIsNumber( char *pcSrc, char **ppcNext );
static bool _jsonIsObject( char *pcSrc, char **ppcNext );
static bool _jsonIsString( char *pcSrc, char **ppcNext );
char *_jsonNext( char *pcSrc, int iValue );

/**
*	_jsonExtendResp
*
*		Extend the JSON encoding buffer. The JSON encoding buffer is allocated with a
*		default size, if however, the amount of data to be encoded exceeds the current
*		buffer size the buffer needs to be extended.
*		
*	@param	ppcResp			Address of a pointer of type char marking the buffer
*	@param	piSize			Address of a pointer of type size_t marking the current
*							buffer size.
*	@param	ppcOffset		Address of a pointer of type char marking the current
*							offset in the buffer.
*
*	@return		Address of the extended buffer or NULL in case of failure.
**/
static char *_jsonExtendResp( char **ppcResp, size_t *piSize, char **ppcOffset )
{
	char	*pcNewResp;
	size_t	iRespLen;
	
	iRespLen = *ppcOffset - *ppcResp;
	*piSize += MAX_RSP_SEGM;
	
	if( (pcNewResp = realloc( *ppcResp, *piSize )) )
	{
		*ppcOffset = (char *)(pcNewResp + iRespLen);
		*ppcResp   = pcNewResp;
	}
	return pcNewResp;
}

/**
*	_jsonGetProp
*
*		Returns the 'property' string of a JSON 'property:value' pair. The property
*		is a JSON string bound on the right by a colon (:).
*
*	@param	pcSrc			Address C-string containing the 'property:value' pair.
*	@param	iPropSize		Size of the output buffer receiving the property string.
*	@param	ppcProp			Address of a pointer of type char marking the buffer which
*							will receive the property string.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the colon.
*
*	@return		Address C-string containing the property string or NULL
**/
static char *_jsonGetProp( char *pcSrc, size_t iPropSize, char **ppcProp, char **ppcNext )
{
	char	cProp[256];
	char	*pcEOD;
	
	*(*ppcProp) = '\0';

	if( _jsonIsString( pcSrc, &pcEOD ) )
	{
		if( (pcEOD-pcSrc) < sizeof(cProp) )
		{
			strncpyz( cProp, pcSrc,(pcEOD-pcSrc) );
			strtrim( cProp, (TRIM_M_WSP | TRIM_M_QUOTES) );
			if( strlen(cProp) < iPropSize )
			{
				if( (pcEOD = _jsonNext( pcEOD, ':' )) )
				{
					strcpy( *ppcProp, cProp );
					*ppcNext = pcEOD;
					return *ppcProp;
				}
			}
		}
	}
	return NULL;
}

/**
*	_jsonGetValue
*
*		Returns a JSON encoded value as a C-style string.
*
*			json-value ::= string | number | object | array | 'true' | 'false' | 'null'
*
*	@param	pcSrc			Address C-string containing the 'property:value' pair.
*	@param	iValSize		Size of the output buffer receiving the JSON value.
*	@param	ppcValue		Address of a pointer of type char marking the buffer which
*							will receive the JSON value.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the value.
*
*	@return		Address C-string containing the JSON value or NULL
**/
static char *_jsonGetValue( char *pcSrc, size_t iValSize, char **ppcValue, char **ppcNext )
{
	size_t	iValLen;
		
	*(*ppcValue) = '\0';

	if( pcSrc && *pcSrc )
	{
		if( _jsonIsString( pcSrc, ppcNext ) || _jsonIsBoolean( pcSrc, ppcNext ) || 
			_jsonIsObject( pcSrc, ppcNext ) || _jsonIsArray( pcSrc, ppcNext )  || 
			_jsonIsNumber( pcSrc, ppcNext ) || _jsonIsNull( pcSrc, ppcNext ) )
		{
			iValLen = *ppcNext - pcSrc;
			if( iValLen < iValSize )
			{
				strncpyz( *ppcValue, pcSrc, iValLen );
				return *ppcValue;
			}
		}
	}
	return NULL;
}

/**
*	_jsonIsArray
*
*		Returns true if a sequenec of character represents a JSON array type object.
*
*		array	::= '[' (value (',' value)*)? ']'
*
*	@param	pcSrc			Address C-string containing the JSON array.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the array.
*
*	@return	True or False
**/
static bool _jsonIsArray( char *pcSrc, char **ppcNext )
{
	char	*pcEOD;
	
	if( *pcSrc == '[' )
	{
		if( (pcEOD = strpair( strfchr( pcSrc ), '[', ']' )) )
		{
			*ppcNext = ++pcEOD;
			return true;
		}
	}
	return false;
}

/**
*	_jsonIsBoolean
*
*		Returns true if a sequenec of character represents a JSON boolean value.
*
*		boolean	::= 'true' | 'false'
*
*	@param	pcSrc			Address C-string containing the JSON boolean value.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the boolean.
*
*	@return	True or False
**/
static bool _jsonIsBoolean( char *pcSrc, char **ppcNext )
{
	char	cValue[16];
	int		iValLen;
	
	iValLen = strcspn( pcSrc, "," );
	if( iValLen < sizeof(cValue) )
	{
		strncpyz( cValue, pcSrc, iValLen );
		strtrim( cValue, TRIM_M_WSP );
		
		if( !strcmp(cValue, "true") || !strcmp(cValue, "false") )
		{
			*ppcNext = pcSrc + iValLen;
			return true;
		}
	}
	return false;
}

/**
*	_jsonIsNull
*
*		Returns true if a sequenec of character represents the JSON null value.
*
*		null	::= 'null'
*
*	@param	pcSrc			Address C-string containing the JSON 'null' value.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the
*							'null' value.
*
*	@return	True or False
**/
static bool _jsonIsNull( char *pcSrc, char **ppcNext )
{
	char	cValue[16];
	size_t	iValLen;

	iValLen = strcspn( pcSrc, "," );
	if( iValLen < sizeof(cValue) )
	{
		strncpyz( cValue, pcSrc, iValLen );
		strtrim( cValue, TRIM_M_WSP );
		
		if( !strcmp(cValue, "null") )
		{
			*ppcNext = pcSrc + iValLen;
			return true;
		}
	}
	return false;
}

/**
*	_jsonIsNumber
*
*		Returns true if a sequenec of character represents a JSON number.
*
*		number		::= '-'? ( '0' | nz-digit+ ) ('.' digit+ )? (('E'|'e') ('+'|'-')? digit+ )? 
*		nz-digit	::= '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
*		digit		::= 0 | nz-digit
*
*	@param	pcSrc			Address C-string containing the JSON encoded number.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the number.
*
*	@return	True or False
**/

static bool _jsonIsNumber( char *pcSrc, char **ppcNext )
{
	char	*pcEOD = pcSrc;
	
	strtod( pcSrc, &pcEOD );

	if( isspace(*pcEOD) || !*pcEOD || *pcEOD == ',' )
	{
		*ppcNext = pcEOD;
		return true;
	}
	*ppcNext = pcEOD;
	return false;
}

/**
*	_jsonIsObject
*
*		Returns true if a sequenec of character represents a JSON object.
*
*		object ::= '{' (member (',' member)*)? '}'
*		member ::= string ':' value
*
*	@param	pcSrc			Address C-string containing the JSON encoded object.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the object.
*
*	@return	True or False
**/
static bool _jsonIsObject( char *pcSrc, char **ppcNext )
{
	char	*pcEOD;
	
	if( *pcSrc == '{' )
	{
		if( (pcEOD = strpair( strfchr( pcSrc ), '{', '}' )) )
		{
			*ppcNext = ++pcEOD;
			return true;
		}
	}
	return false;
}

/**
*	_jsonIsString
*
*		Returns true if a sequenec of character represents a JSON string.
*
*		string ::= '"' char* '"'
*
*	@param	pcSrc			Address C-string containing the JSON encoded string.
*	@param	ppcNext			Address of a pointer of type char, whose value is set by
*							the function to the next character in pcSrc after the
*							JSON string.
*
*	@return	True or False
**/
static bool _jsonIsString( char *pcSrc, char **ppcNext )
{
	char	*pcStr = pcSrc;
	int		i;
	
	if( *pcStr++ == '"' )
	{
		while( *pcStr && *pcStr != '"' && !iscntrl(*pcStr) )
		{
			if( *pcStr == '\\' )
			{
				switch( *(pcStr+1) )
				{
					case '"':
					case '\\':
					case '/':
					case 'b':
					case 'f':
					case 'n':
					case 'r':
					case 't':
						pcStr++;
						break;
					case 'u':
						for( i=4, pcStr += 2; isxdigit(*pcStr); i-- ) pcStr++;
						if( !i ) 
						{
							continue;
						}
						/* NO BREAK HERE */
					default:
						*ppcNext = pcStr;
						return false;
				}
			}
			pcStr++;
		}
		if( *pcStr == '"' )
		{
			*ppcNext = ++pcStr;
			return true;
		}
	}
	*ppcNext = pcStr;		// Return address violating character
	return false;
}

/**
*	_jsonNext
*
*		Returns the address of the first character following a seperator character
*		identified by parameter iValue. If the first non-whitespace character is 
*		not the separator character NULL is returned.
*
*	@param	pcSrc			Address C-string.
*	@param	iValue			ASCII value of the separator character.
*
*	@return		Address of character following the separator or NULL
**/
char *_jsonNext( char *pcSrc, int iValue )
{
	char	*s = strfchr(pcSrc);
	
	return (*s ? ((*s == iValue) ? strfchr(s+1) : NULL) : s);
}


/**
*	_jsonTrimBrackets
*
*		Remove outer brackets after which any leading and trailing whitespace is
*		eliminated.
*
*	@param	pcLBrck			Offset of the left bracket in a C-string
*	@param	pcRBrck			Offset of the right bracket in a C-string
*
*	@return		Address C-string with brackets removed.
**/
char *_jsonTrimBrackets( char *pcLBrck, char *pcRBrck )
{
	*pcRBrck = '\0';
	memmove( pcLBrck, pcLBrck+1, (pcRBrck - pcLBrck) );
	return strtrim( pcLBrck, TRIM_M_WSP );
}

/**
*	_jsonDecodeString
*
*		Decode a DATA struct of type string. The value of the string type must be
*		JSON encoded otherwise NULL is returned.
*
*	@note	The content of a JSON array or object are parsed recursive but because
*			the JSON strings are small and never exceed MAX_BUF_SIZE in length no
*			stack overflow should happen.
*
*	@param	ptString		Address of a DATA struct of type string.
*
*	@return		Address of a DATA struct.
**/
static DATA *_jsonDecodeString( DATA *ptString )
{
	DATA	*ptCopy = newVar( NULL, ptString ),
			*ptMember,
			*pObject,
			*ptValue;
	char	cBuffer[MAX_BUF_SIZE],
			cValue[MAX_BUF_SIZE],
			cProp[MAX_BUF_SIZE],
			*pcValue = cValue,
			*pcProp  = cProp,
			*pcSrc, *pcNext;
	long	lValue;
	
	strncpyz( cBuffer, (char *)ptCopy->value.pcString, sizeof(cBuffer)-1 );
	pcSrc = strtrim( cBuffer, TRIM_M_WSP );

	if( pcSrc && *pcSrc )
	{
		// object ::= '{' member (',' member)* '}'
		// member ::= property ':' value
		if( _jsonIsObject( pcSrc, &pcNext ) )
		{
			_jsonTrimBrackets( pcSrc, (pcNext-1) );
			pObject = newObject( ptCopy->name );

			while( pcSrc && *pcSrc )
			{
				if( _jsonGetProp( pcSrc, sizeof(cProp), &pcProp, &pcNext ) )
				{
					if( _jsonGetValue( pcNext, sizeof(cValue), &pcValue, &pcNext ) )
					{
						ptValue  = newString( pcProp, pcValue );
						if( (ptMember = _jsonDecodeString( ptValue )) )
						{
							varPush( pObject, ptMember );
							if( (pcSrc = _jsonNext( pcNext, ',' )) )
							{
								destroy( ptValue ); 
								continue;
							}
						}
						destroy( ptValue ); 
					}
				}
				destroy( pObject );
				destroy( ptCopy );
				return NULL;
			}
			destroy( ptCopy );
			return pObject;
		}
		// array ::= '[' value (',' value)* ']'
		if( _jsonIsArray( pcSrc, &pcNext ) )
		{
			_jsonTrimBrackets( pcSrc, (pcNext-1) );
			pObject = newArray( ptCopy->name );

			while( pcSrc && *pcSrc )
			{
				if( _jsonGetValue( pcSrc, sizeof(cValue), &pcValue, &pcNext ) )
				{
					ptValue  = newString( NULL, pcValue );
					if( (ptMember = _jsonDecodeString( ptValue )) )
					{
						varPush( pObject, ptMember );
						if( (pcSrc = _jsonNext( pcNext, ',' )) )
						{
							destroy( ptValue ); 
							continue;
						}
					}
					destroy( ptValue ); 
				}
				destroy( pObject );
				destroy( ptCopy );
				return NULL;
			}
			destroy( ptCopy );
			return pObject;
		}
		
		if( _jsonIsString( pcSrc, &pcNext ) ) 
		{
			strtrim( pcSrc, TRIM_M_QUOTES );
			varSet( ptCopy, pcSrc );
			return ptCopy;
		}
		if( _jsonIsNumber( pcSrc, &pcNext ) )
		{
			lValue = (long)strtod(pcSrc, NULL);
			ptMember = newInteger( ptCopy->name, lValue );
			destroy( ptCopy );
			return ptMember;
		}
		if( _jsonIsBoolean( pcSrc, &pcNext ) )
		{
			ptMember = newBoolean( ptCopy->name, !strcmp(pcSrc,"true") );
			destroy( ptCopy );
			return ptMember;
		}
		if( _jsonIsNull( pcSrc, &pcNext ) )
		{
			ptMember = newNull( ptCopy->name );
			destroy( ptCopy );
			return ptMember;
		}
		// Invalid JSON type.
		destroy( ptCopy );
		return NULL;		
	}
	return ptCopy;
}

/**
*	jsonDecode
*
*		JSON decode the content of a data buffer. The buffer content is either a
*		DATA struct of type string or a C-string.
*
*	@param	pvData			Address of the data buffer to be decoded.
*
*	@return		Address of a DATA struct whose content is the JSON decoded
*				buffer.
**/
DATA *jsonDecode( void *pvData )
{
	DATA	*pObject = (DATA *)pvData,
			*ptString;

	if( pvData )
	{
		if( isData( pObject ) )
		{
			if( isString( pObject ) )
			{
				return _jsonDecodeString( pObject );
			}
		}
		else // Try C-style string
		{
			if( (ptString = newString( NULL, pvData )) )
			{
				pObject = jsonDecode( ptString );
				destroy( ptString );
				return pObject;
			}
		}
	}
	return NULL;
}

/**
*	_jsonEncodeFileInfo
*
*		JSON encode a list of FILE_INFO structs. The response buffer size is automatically
*		extended if required.
*
*	@param	pFileList		Address LIST struct.
*	@param	ppcResp			Address of a pointer of type char containing the address
*							of the response buffer
*	@param	piSize			Address of a pointer of type int containing the current 
*							response buffer size.
*	@param	imFlags			Bit mask of encoding flags.
*	@param	ppcDest			Address of a pointer of type char identifying the current
*							offset in the response buffer.
*
*	@return		On success 1 otherwise 0
**/
static int _jsonEncodeFileInfo( LIST *pFileList, char **ppcResp, size_t *piSize, int imFlags, char **ppcDest )
{
	FILE_INFO	*pFileInfo;
	ENTRY		*pEntry;
	int			iFree;

	for( pEntry = pFileList->pNext; pEntry != pFileList; pEntry = pEntry->pNext )
	{
		iFree = *piSize - (*ppcDest - *ppcResp);
		if( iFree < 1024 ) 
		{
			if( !_jsonExtendResp( ppcResp, piSize, ppcDest ) ) 
			{
				return 0;
			}
			iFree = *piSize - (*ppcDest - *ppcResp);
		}

		if( (pFileInfo = (FILE_INFO *)pEntry->pvData) )
		{
			*(*ppcDest)++ = '{';
			*ppcDest += snprintf( *ppcDest, iFree, "\"name\":\"%s\"", pFileInfo->pcName );
			*ppcDest += snprintf( *ppcDest, iFree, ",\"path\":\"%s\"", pFileInfo->pcPath );
			*ppcDest += snprintf( *ppcDest, iFree, ",\"size\":%d", pFileInfo->lSize );
			*ppcDest += snprintf( *ppcDest, iFree, ",\"modified\":%d", pFileInfo->lModified );

			// Include directory related info if, and only if, it is a directory...
			if( (pFileInfo->iPropMask & PROP_M_DIRECTORY)  )
			{
				*ppcDest += snprintf( *ppcDest, iFree, ",\"directory\":true" );
				if( (pFileInfo->iPropMask & PROP_M_CHILDREN)  )
				{
					*ppcDest += snprintf( *ppcDest, iFree, ",\"_EX\":true" );
					*ppcDest += snprintf( *ppcDest, iFree, ",\"children\":[" );
					_jsonEncodeFileInfo( pFileInfo->pChildren, ppcResp, piSize, imFlags, ppcDest );
					*(*ppcDest)++ = ']';
				} 
				else 
				{
					*ppcDest += snprintf( *ppcDest, iFree, ",\"_EX\":false" );
					*ppcDest += snprintf( *ppcDest, iFree, ",\"children\":[]" );
				}
			}
			if( (pFileInfo->iPropMask & PROP_M_OLDPATH)  )
			{
				*ppcDest += snprintf( *ppcDest, iFree, ",\"oldPath\":\"%s\"", pFileInfo->pcOldPath );
			}
			*(*ppcDest)++ = '}';
			if( pEntry->pNext != pFileList )
			{
				*(*ppcDest)++ = ',';
			}
		}
	}
	return 1;
}

/**
*	jsonEncode
*
*		JSON encode a list of FILE_INFO structs. The result is a JSON encode array.
*
*	@note	It the callers responsibility to release (free) the resources
*			associated with the returned result.
*
*	@param	pFileList
*	@param	imFlags			Integer bit mask (not used yet).
*
*	@return		Address C-string containing the JSON encoded file list
**/
char *jsonEncode( LIST *pFileList, int imFlags )
{
	size_t	iSize = MAX_RSP_SEGM;
	char	*pcJSON = NULL,
			*pcOffset;

	if( pFileList )
	{
		if( (pcJSON = (char *)malloc(iSize)) )
		{
			pcOffset = pcJSON;

			*pcOffset++ = '[';
			
			_jsonEncodeFileInfo( pFileList, &pcJSON, &iSize, imFlags, &pcOffset );

			*pcOffset++ = ']';
			*pcOffset = '\0';
		}
	}
	else // At least return an empty array.
	{
		pcJSON = mstrcpy( "[]" );
	}
	return pcJSON;
}
