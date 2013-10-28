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
*		This module provides some basic extensions to the standard C libraries.
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

#include "cbtreeCommon.h"
#include "cbtreeString.h"

/**
*	_strpair
*
*		Match a pair of left and right delimiters.  The pair of delimiters can be
*		nested. However, the string of characters is NOT checked for any literals.
*		On success, piCount, if specified, returns the total number of characters
*		in between the two outer most delimiters.
*
*	@param	src			Reference to a zero terminated string
*	@param	iLvalue		ASCII value of left delimiter
*	@param	iRvalue		ASCII value of right delimiter
*	@param	piCount		Address integer receiving the total number of characters
*						between the delimiters.
*
*	@return		Address right side delimiter.
**/
static char *_strpair( char *src, int iLvalue, int iRvalue, int *piCount )
{
	int	iLbr = 0,
		iCnt = 0;

	if( src && *src == iLvalue )
	{
		while( *src )
		{
			if( *src == iLvalue || *src == iRvalue )
			{
				if( *src == iLvalue )
				{
					if( !iLbr++ )
					{
						src++;
						continue;
					}

					if( iLvalue == iRvalue )
					{
						if( piCount ) *piCount = iCnt;
						return src;
					}
				}
				if( *src == iRvalue )
				{
					if( --iLbr == 0 )
					{
						if( piCount ) *piCount = iCnt;
						return src;
					}
				}
			}
			iCnt++;
			src++;
		}
	}
	if( piCount ) *piCount = 0;
	return NULL;
}

/**
*	isBoolean
*
**/
bool isBoolean( char *pcSrc, bool *pbValue )
{
	char	cBuffer[MAX_BUF_SIZE];
	
	if( pcSrc && *pcSrc )
	{
		strncpyz( cBuffer, pcSrc, sizeof(cBuffer)-1 );
		strtrim( cBuffer, (TRIM_M_WSP | TRIM_M_QUOTES) );
		
		if( !strcmp(cBuffer,"true") )
		{
			if( pbValue ) 
			{
				*pbValue = true;
			}
			return true;
		}
		if( !strcmp(cBuffer,"false") )
		{
			if( pbValue ) 
			{
				*pbValue = false;
			}
			return true;
		}
	}
	return false;
}

/**
*	isNumeric
*
*	@param	pcSrc		Pointer to a zero terminated string
*	@param	plValue		Numeric value
*
*	@return		False
*				True
**/
bool isNumeric( char *pcSrc, long *plValue )
{
	char	*nxt;
	double	dValue;
	long	lValue;

	if( plValue ) *plValue = 0;								// Reset the output value.
	if( pcSrc && *pcSrc )
	{
		// Try integer first
		lValue = strtol( pcSrc, &nxt, 0 );
		if( !*nxt )
		{
			if( plValue ) *plValue = lValue;
			return true;
		}
		// Try double/float
		dValue = strtod( pcSrc, &nxt );
		if( !*nxt )
		{
			if( plValue ) *plValue = (long)dValue;
			return true;
		}
	}
	return false;
}

/**
*	isQuoted
*
**/
bool isQuoted( char *s )
{
	int	i;

	if( s != NULL )
	{
		if( ( i = strlen(s) ) > 1)							// We need at least 2 or more char.
		{
			if( (s[0] == '\'' && s[i-1] == '\'') ||
				(s[0] == '"' && s[i-1] == '"') )
			{
				return true;
			}
		}
	}
	return false;
}

/**
*	mstrncpy
*
**/
char *mstrncpy( const char *src, size_t len )
{
	const char *s = src;
	char		*b = NULL,
				*d;
	size_t	i;
	
	if( s != NULL && len >= 0 )
	{
		if( (b = (char *)malloc( len+1 )) )
		{
			d = b;
			for( i=0; i<len; i++ ) *d++ = *s++;  
			*d = '\0';
		}
	}
	return b;
}

/**
*	mstrcpy
*
**/
char *mstrcpy( const char *src )
{
	return (src ? mstrncpy( src, strlen(src) ) : NULL );
}

/**
*	strcap
*
**/
char *strcap( char *src )
{
	char	*s = src;
	
	while( *s ) 
	{
		*s = (char)tolower(*s);
		s++;
	}
	*src = (char)toupper( *src );
	return src;
}

/**
*	strcpair
*
*		Match a pair of left and right delimiters. On success, returns the total
*		number of characters in between the two outer most delimiters.
*
*	@param	src			Reference to a zero terminated string
*	@param	iLvalue
*	@param	iRvalue
*
*	@return		Character count between delimiters
**/
int strcpair( char *src, int iLvalue, int iRvalue )
{
	int	iLen;

	if( _strpair( src, iLvalue, iRvalue, &iLen ) )
	{
		return iLen;
	}
	return -1;
}

/**
*	strfchr
*
*		Returns the address of the first non whitespace character following
*		'src'
*
*	@param	src			Reference to a zero terminated string
*
*	@return		Address first non whitespace.
**/
char *strfchr( char *src )
{
	while( src && isspace( *src ) ) src++;
	return src;
}

/**
*	strncpyz
*
**/
char *strncpyz( char *dst, const char *src, size_t len )
{
	if( dst && len >= 0 )
	{
		if( src )
		{
			strncpy( dst, src, len );
			dst[len] = '\0';
		}
		else
			*dst = '\0';
	}
	return dst;
}

/**
*	strpair
*
*		Match a pair of left and right delimiters. On success, returns address
*		of the right side delimiter.
*
*	@param	src			Reference to a zero terminated string
*	@param	iLvalue		Left delimiter
*	@param	iRvalue		Right delimiter
*
*	@return		Address right side delimiter.
**/
char *strpair( char *src, int iLvalue, int iRvalue )
{
	return _strpair( src, iLvalue, iRvalue, NULL );
}

/**
*	strtrim
*
**/
char *strtrim( char *src, int flag )
{
	char	*s, *d;
	int		len;
	
	if( src != NULL && strlen(src) )
	{
		// Substitute <CRLF> or <CR> or <NIL> to <LF>
		if( flag & TRIM_M_CRLF_TO_LF )
		{
			s = d = src;
			while( *s )
			{
				if( *s == 0x0D && *(s+1) == 0x0A )
				{
					*d++ = 0x0A;
					s   += 2;
					continue;
				}
				if( *s == 0x0D || *s == 0x85 )
				{
					*d++ = 0x0A;
					s++;
					continue;
				}
				*d++ = *s++;
			}
			*d = '\0';
		}

		// Substitude the characters 0x09, 0x0A and 0xOD with a single space
		if( flag & TRIM_M_WSP_TO_SP )
		{
			s = src;
			while( *s )
			{
				if( (unsigned char)*s == 0x0A || 
					(unsigned char)*s == 0x0D || 
					(unsigned char)*s == 0x85 || // <NEL>
					(unsigned char)*s == 0x09 )
				{
					*s = 0x20;
				}
				s++;
			}
		}
		// Collapse a sequence of spaces into a single space
		if( flag & TRIM_M_COLLAPSE )
		{
			s = src;
			while( (s = strstr( s, "  " )) )		// Find <space><space>
			{
				d = ++s;
				while( *d == ' ' ) d++;
				memmove( s, d, strlen(d)+1 );	// Move left
			}
		}
		// Strip leading whitespace
		if( flag & TRIM_M_LWSP )
		{
			s = d = src;
			while( isspace((unsigned char)*s) ) { s++; }
			if( s != d ) 
				while( (*d++ = *s++) );
		}
		// Strip trailing spaces 
		d = src + strlen(src);
		if( flag == 0 || (flag & TRIM_M_RWSP) || (flag & TRIM_M_SLASH) )
		{
			while( d > src && isspace((unsigned char)*(d-1)) ) { d--; }
			*d = '\0';
		}
		// Strip trailing slash
		if( flag & TRIM_M_SLASH )
		{
			if( *(d-1) == '\\' || *(d-1) == '/' ) 
			{
				d--;
			}
		}
		*d = '\0';
		// Strip quotes
		if( flag & TRIM_M_QUOTES )
		{
			s = src;
			len = strlen( s );
			if( isQuoted( s ) )									// Is the string enclosed in quotes?
			{
				len = len - 2;									// String length without the quotes.
				memcpy( s, &s[1], len );						// Shift string left.
				s[len]='\0';									// Zero terminate updated string.
				if( flag & TRIM_M_QUOTES_RECUR )
				{
					strtrim(s, flag);							// Check for nested quotes
				}
			}
		}
	}
	return src;
}

