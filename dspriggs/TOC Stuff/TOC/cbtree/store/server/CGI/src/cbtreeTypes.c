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
*		This module provides the functionality to create and maintain so-called
*		dynamic variable. It provides a set of PHP like functions to access and
*		maintain associative arrays, object and other data types.
*
*	NOTE:	The variable data types are only used to manage the CGI environment
*			and variables. For performance, any file search and query operations
*			use native C structures and operations.
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#include "cbtreeCommon.h"
#include "cbtreeString.h"
#include "cbtreeJSON.h"

/**
*	_destroyValue
*
*		Destroy and reset the value of a dynamic variable.
*
*	@param	ptObject		Address of a dynamic variable.
**/
static void _destroyValue( DATA *ptObject )
{
	DATA	*ptMember,
			*ptNext;

	if( ptObject )
	{
		switch( ptObject->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				ptMember = ptObject->value.ptMember;
				while( ptMember )
				{
					ptNext = ptMember->ptNext;
					destroy( ptMember );
					ptMember = ptNext;
				}
				ptObject->value.ptMember = NULL;
				break;
			case TYPE_V_BOOLEAN:
			case TYPE_V_INTEGER:
				ptObject->value.iValue = 0;
				break;
			case TYPE_V_STRING:
				if( ptObject->value.pcString )
				{
					free( ptObject->value.pcString );
					ptObject->value.pcString = NULL;
				}
				break;
		}
		ptObject->length = 0;
	}
}

/**
*	_newVar
*
*		Allocate a new dynamic variable (no type set yet).
*
*	@param	pcName			Address C-string containing the variables property name.
*
*	@return		Address newly allocated dynamic variable.
**/
static DATA *_newVar( const char *pcName )
{
	DATA	*ptData = (DATA *)calloc(1,sizeof(DATA));
	ptData->_magic = MAGIC_V_VALUE;
	if( pcName && *pcName )
	{
		ptData->name = mstrcpy( pcName );
	}
	return ptData;
}

/**
*	_varGetMember
*
*		Return the address of an object member whose property name matches parameter
*		pcProperty. In this context an object can be any variable data type therefore
*		_varGetMember() can operate on ALL supported variable data types.
*
*	@note	The property name can be specified as a C-style union or struct member
*			like: 'query.options.deep'
*
*	@param	pcProperty		Address C-string containing the property name.
*	@param	ptObject		Address any valid variable data type.
*
*	@return		Address DATA struct or NULL if member doesn't exist.
**/
static DATA *_varGetMember( const char *pcProperty, DATA *ptObject )
{
	DATA	*ptMember = NULL;
	char	cPropName[64];
	int		l;
		
	if( isData( ptObject ) )
	{
		switch( ptObject->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				if( pcProperty && *pcProperty )
				{
					l = strcspn( pcProperty, "." );
					strncpyz( cPropName, pcProperty, l );
					for( ptMember = ptObject->value.ptMember; ptMember; ptMember = ptMember->ptNext )
					{
						if( !strcmp( ptMember->name, cPropName ) )
						{
							if( pcProperty[l] == '.' )
							{
								return _varGetMember( &pcProperty[l+1], ptMember );
							}
							break;
						}
					}
				}
				return ptMember;
			default:
				if( !strcmp( ptObject->name, pcProperty ) )
				{
					return ptObject;
				}
				break;
		}
	}
	return NULL;
}

/**
*	destroy
*
*		Release all resource associated with pvData. Parameter pvData can represent
*		the address of a dynamic variable or a standard C data type.
*
*	@param	pvData			Address of a dynamic variable or basic C data type.
**/
void destroy( void *pvData )
{
	DATA	*ptData = (DATA *)pvData,
			*ptMember,
			*ptNext;
			
	if( isData( ptData ) )
	{
		switch( ptData->type )
		{
			case TYPE_V_BOOLEAN:
			case TYPE_V_INTEGER:
			case TYPE_V_NULL:
				break;
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				ptMember = ptData->value.ptMember;
				while( ptMember )
				{
					ptNext = ptMember->ptNext;
					destroy( ptMember );
					ptMember = ptNext;
				}
				break;
			case TYPE_V_STRING:
				free( ptData->value.pcString );
				break;
		}
		free( ptData->name );
	}
	free( pvData );
	return;
}

/**
*	hasProperty
*
*		Returns true if a dynamic variable has a member whose property name matches
*		pcProperty. If parameter ptObject is not an array or object the property name
*		of ptObject itself is tested.
*
*	@param	pcProperty		Address C-string containing the property name.
*	@param	ptObject		Address any valid variable data type.
*
*	@return		True or false.
**/
bool hasProperty( const char *pcProperty, DATA *ptObject )
{
	if( _varGetMember( pcProperty, ptObject ) )
	{
		return true;
	}
	return false;
}

/**
*	isData
*
*		Returns true if the data structure pointed to by parameter pvData is a
*		valid dynamic variable data type.
*
*	@param	pvData			Address data structure.
*
*	@return		True or false.
**/
bool isData( void *pvData )
{
	DATA	*ptType = (DATA *)pvData;

	if( ptType && ptType->_magic == MAGIC_V_VALUE )
	{
		switch( ptType->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
			case TYPE_V_BOOLEAN:
			case TYPE_V_INTEGER:
			case TYPE_V_STRING:
			case TYPE_V_NULL:
				return true;
		}
	}
	return false;
}

/**
*	isType
*
*		Returns true if the data structure pointed to by parameter pvData is a
*		valid dynamic variable of type iType.
*
*	@param	pvData			Address data structure.
*	@param	iType			Symbolic value of dynamic variable data type.
*
*	@return		True or false.
**/
bool isType( void *pvData, int iType )
{
	if( isData(pvData) && ((DATA *)pvData)->type == iType )
	{
		return true;
	}
	return false;
}

/**
*	newVar
*
*		Allocate a new dynamic variable and assign pcName as its property name.
*		If parameter pvValue is specified it is treated as the address of the
*		value to be assigned to the new variable. Parameter pvValue can be either
*		the address of an existing dynamic variable or a C basic type.
*
*	@param	pcName			Address C-string containing the property name.
*	@param	pvValue			Address of a dynamic variable or basic C data type.
*
*	@return		Address newly allocated dynamic variable 
**/
DATA *newVar( const char *pcName, void *pvValue )
{
	DATA		*ptNewVar = NULL,
				*ptMember,
				*ptValue;
	const char	*pcPropNam;
	char		cValue[MAX_BUF_SIZE];
	long		lValue;
	bool		bValue;
	
	if( isData( pvValue ) )
	{
		ptValue	  = (DATA *)pvValue;
		pcPropNam = pcName ? pcName : ptValue->name;

		switch( ptValue->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				ptNewVar	   = _newVar( pcPropNam );
				ptNewVar->type = ptValue->type;
				for( ptMember = ptValue->value.ptMember; ptMember; ptMember = ptMember->ptNext )
				{
					varPush( ptNewVar, newVar( ptMember->name, ptMember ));
				}	
				break;
			case TYPE_V_BOOLEAN:
				ptNewVar = newBoolean( pcPropNam, ptValue->value.iValue );
				break;
			case TYPE_V_INTEGER:
				ptNewVar = newInteger( pcPropNam, ptValue->value.iValue );
				break;
			case TYPE_V_STRING:
				ptNewVar = newString( pcPropNam, ptValue->value.pcString );
				break;
			case TYPE_V_NULL:
				ptNewVar = newNull( pcPropNam );
				break;
		}
	}
	else /* Value is not a data type, assume it is a C-style string.... */
	{
		if( pvValue )
		{
			strncpy( cValue, (char *)pvValue, sizeof(cValue)-1);
			cValue[sizeof(cValue)-1] = '\0';

			if( isNumeric( cValue, &lValue ) )
			{
				return newInteger( pcName, (int)lValue );
			}
			if( isBoolean( cValue, &bValue ) )
			{
				return newBoolean( pcName, bValue );
			}
			return newString( pcName, cValue );
		}
		return newString( pcName, NULL );
	}
	return ptNewVar;
}

/**
*	newArray
*
*		Allocate a dynamic variable of type array.
*
*	@param	pcName			Address C-string containing the property name.
*
*	@return		Address dynamic variable of type array 
**/
DATA *newArray( const char *pcName )
{
	DATA	*ptArray;
	
	if( (ptArray = _newVar( pcName )) )
	{
		ptArray->type = TYPE_V_ARRAY;
	}
	return ptArray;
}

/**
*	newBoolean
*
*		Allocate a dynamic variable of type array.
*
*	@param	pcName			Address C-string containing the property name.
*	@param	bValue			Boolean value (true|false) to be assigned.
*
*	@return		Address dynamic variable of type boolean.
**/
DATA *newBoolean( const char *pcName, bool bValue )
{
	DATA	*ptInt;
	
	if( (ptInt = _newVar( pcName )) )
	{
		ptInt->type			= TYPE_V_BOOLEAN;
		ptInt->value.iValue = bValue ? 1 : 0;
		ptInt->length		= 1;
	}
	return ptInt;
}

/**
*	newNull
*
*		Allocate a dynamic variable of type null.
*
*	@param	pcName			Address C-string containing the property name.
*
*	@return		Address dynamic variable of type null
**/
DATA *newNull( const char *pcName )
{
	DATA	*ptObject;
	
	if( (ptObject = _newVar( pcName )) )
	{
		ptObject->type = TYPE_V_NULL;
	}
	return ptObject;
}

/**
*	newObject
*
*		Allocate a dynamic variable of type object.
*
*	@param	pcName			Address C-string containing the property name.
*
*	@return		Address dynamic variable of type object
**/
DATA *newObject( const char *pcName )
{
	DATA	*ptObject;
	
	if( (ptObject = _newVar( pcName )) )
	{
		ptObject->type = TYPE_V_OBJECT;
	}
	return ptObject;
}

/**
*	newInteger
*
*		Allocate a dynamic variable of type integer.
*
*	@param	pcName			Address C-string containing the property name.
*	@param	iValue			Integer value to be assigned.
*
*	@return		Address dynamic variable of type integer.
**/
DATA *newInteger( const char *pcName, int iValue )
{
	DATA	*ptInt;
	
	if( (ptInt = _newVar( pcName )) )
	{
		ptInt->type			= TYPE_V_INTEGER;
		ptInt->value.iValue = iValue;
		ptInt->length		= 1;
	}
	return ptInt;
}

/**
*	newString
*
*		Allocate a dynamic variable of type string.
*
*	@param	pcName			Address C-string containing the property name.
*	@param	pcValue			Address C-string to be assigned.
*
*	@return		Address dynamic variable of type string.
**/
DATA *newString( const char *pcName, char *pcValue )
{
	DATA	*ptString;
	
	if( (ptString = _newVar( pcName )) )
	{
		ptString->type = TYPE_V_STRING;
		if( pcValue && *pcValue )
		{
			ptString->value.pcString = mstrcpy( pcValue );
			ptString->length		 = strlen( pcValue );
		}
	}
	return ptString;
}

/**
*	varCount
*
*		Returns the total number of members in an array or object.
*
*	@param	pvData			Address of a dynamic array or object
*
*	@return		Number of array or object members.
**/
int varCount( void *pvData )
{
	if( isArray( pvData ) || isObject( pvData ) )
	{
		return ((DATA *)pvData)->length;
	}
	return 0;
}

/**
*	varGet
*
*		Return the value of a dynamic variable.
*
*	@param	ptVar			Address dynamic variable.
**/
void *varGet( DATA *ptVar )
{
	if( isData( ptVar ) )
	{
		switch( ptVar->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				break;
			case TYPE_V_BOOLEAN:
				return (void *)(ptVar->value.iValue ? 1 : 0);
			case TYPE_V_INTEGER:
				return (void *)ptVar->value.iValue;
				break;
			case TYPE_V_STRING:
				return ptVar->value.pcString;
			case TYPE_V_NULL:
				break;
		}
	}
	return NULL;
}

/**
*	varGetByIndex
*
*		Return the address of array member by its index. If the index is out of
*		range NULL is returned.
*
*	@param	iIndex			Integer index value.
*	@param	ptObject		Address dynamic array.
*
*	@return		Address dynamic variable.
**/
DATA *varGetByIndex( int iIndex, DATA *ptObject )
{
	DATA	*ptProp;
	
	if( isArray( ptObject ) && iIndex >= 0 )
	{
		for( ptProp = ptObject->value.ptMember; ptProp && iIndex; ptProp = ptProp->ptNext, iIndex-- );
		return ptProp;
	}
	return NULL;
}

/**
*	varGetProperties
*
*		Returns a list of property names of an array or object.
*
*	@param	ptObject		Address dynamic array or object.
*
*	@return		Address dynamic variable of type array.
**/
DATA *varGetProperties( DATA *ptObject )
{
	DATA	*ptKeys = NULL,
			*ptMember;
	
	if( isArray( ptObject ) || isObject( ptObject ))
	{
		if( (ptKeys = newArray(NULL)) )
		{
			for( ptMember = (DATA *)ptObject->value.ptMember; ptMember; ptMember = ptMember->ptNext )
			{
				varPush( ptKeys, newString( NULL, ptMember->name ) );
			}
		}
	}
	return ptKeys;
}

/**
*	varGetProperty
*
*		Returns the address of array or object member by its property name. If the
*		property doesn't exist NULL is returned.
*
*	@param	pcProperty		Address C-string containig the property name.
*	@param	ptVar			Address dynamic variable.
*
*	@return		Address dynamic variable.
**/
void *varGetProperty( const char *pcProperty, DATA *ptVar )
{
	if( ptVar && (pcProperty && *pcProperty) )
	{
		return _varGetMember( pcProperty, ptVar );
	}
	return NULL;
}

/**
*	varGetType
*
*		Returns the symbolic value of a dynamic variables data type. If parameter
*		ptVar does not identify a valid dynamic variable TYPE_V_NONE is returned.
*
*	@param	ptVar			Address dynamic variable.
*
*	@return		Symbolic value of the data type.
**/
int varGetType( DATA *ptVar )
{
	if( isData(ptVar) )
	{
		return ptVar->type;
	}
	return TYPE_V_NONE;
}

/**
*	varInArray
*
*		Returns true is a value, identified by parameter pcValue, is found in a
*		dynamic varaible of type array otherwise false.
*
*	@param	pcValue			Address C-string containing the value to be searched for.
*	@param	ptObject		Address dynamic variable of type array.
*
*	@return		True or False.
**/
bool varInArray( char *pcValue, DATA *ptObject )
{
	DATA	*ptMember;
	
	if( (ptMember = varSearch( pcValue, ptObject )) )
	{
		destroy( ptMember );
		return true;
	}
	return false;
}

/**
*	varNewProperty
*
*		Add a new property/member to an dynamic array or object. If the property
*		already exists NULL is returned.
*
*	@param	pcProperty		Address C-string containing the property name.
*	@param	pvValue			Address value to be assigned to the property.
*	@param	ptVar			Address dynamic variable of type array or object.
**/
DATA *varNewProperty( const char *pcProperty, void *pvValue, DATA *ptVar )
{
	DATA	*ptMember;

	if( (isArray( ptVar ) || isObject( ptVar )) && (pcProperty && *pcProperty))
	{
		if( !_varGetMember( pcProperty, ptVar ) )
		{
			ptMember = newVar( pcProperty, pvValue );
			varPush( ptVar, ptMember );
			return ptMember;
		}
		// NOTE: don't call varSetProperty() if property already exist.
	}
	return NULL;
}

/**
*	varPush
*
*		PHP style push operation adding a new member to a dynamic array or object.
*		If ptObject is an array and the new member has no property name, the name
*		will be assigned the index in the array.
*
*	@note	Function varPush() does not check if the property already exists.
*
*	@param	ptObject		Address dynamic variable of type array or object.
*	@param	ptMember		Address dynamic variable.
*
*	@return	Integer index number of the inserted member or -1 in case of failure.
**/
int varPush( DATA *ptObject, DATA *ptMember )
{
	DATA	*ptLast;
	char	cIndex[16];
	int i = 0;

	if( ptObject && ptMember )
	{
		if( (isArray( ptObject ) || isObject( ptObject )) && isData(ptMember) )
		{
			if( ptObject->value.ptMember )
			{
				for( ptLast = ptObject->value.ptMember; ptLast->ptNext; ptLast = ptLast->ptNext, i++ );
				ptLast->ptNext = ptMember;
			}
			else  /* It's the first element. */
			{
				ptObject->value.ptMember = ptMember;
			}
			if( isArray( ptObject ) && !ptMember->name )
			{
				sprintf( cIndex, "%d", ptObject->length );
				ptMember->name = mstrcpy( cIndex );
			}
			ptObject->length++;
			return i;
		}
	}
	return -1;
}

/**
*	varSearch
*
*		Search a dynamic array or object for a member whose value equals pcValue.
*
*	@param	pcValue			Address C-string containing the value to search for.
*	@param	ptObject		Address dynamic variable of type array or object.
*
*	@return		The address of the array or object member if found otherwise NULL.
**/
DATA *varSearch( char *pcValue, DATA *ptObject )
{
	DATA	*ptMember;
	
	if( ptObject && (pcValue && *pcValue) )
	{
		if( isArray( ptObject ) || isObject( ptObject) )
		{
			for( ptMember = ptObject->value.ptMember; ptMember; ptMember = ptMember->ptNext )
			{
				if( !strcmp( ptMember->value.pcString, pcValue ) )
				{
					return newString( NULL, ptMember->name );
				}
			}
		}
	}
	return NULL;
}

/**
*	varSet
*
*		Assign a new value to a dynamic variable. Parameter pvValue represents the
*		address of either a dynamic variable or a basic C data type.
*
*	@param	ptVar			Address dynamic variable.
*	@param	pvValue			Address data to be assigned.
*
*	@return		On success, the address of reassigned dynamic variable (ptVar)
*				otherwise NULL.
**/
DATA *varSet( DATA *ptVar, void *pvValue )
{
	DATA	*ptValObj = (DATA *)pvValue,
			*ptMember;
	
	if( isData( ptVar ) )
	{
		_destroyValue( ptVar );
		if( isData( ptValObj ) )
		{
			switch( ptValObj->type )
			{
				case TYPE_V_ARRAY:
				case TYPE_V_OBJECT:
					ptVar->type	= ptValObj->type;
					for( ptMember = ptValObj->value.ptMember; ptMember; ptMember = ptMember->ptNext )
					{
						switch( ptMember->type )
						{
							case TYPE_V_ARRAY:
							case TYPE_V_OBJECT:
								varPush( ptVar, newVar( NULL, ptMember ) );
								break;
							case TYPE_V_BOOLEAN:
								varPush( ptVar, newBoolean( ptMember->name, ptMember->value.iValue ) );
								break;
							case TYPE_V_INTEGER:
								varPush( ptVar, newInteger( ptMember->name, ptMember->value.iValue ) );
								break;
							case TYPE_V_STRING:
								varPush( ptVar, newString( ptMember->name, ptMember->value.pcString ) );
								break;
						}
					}
					break;
				case TYPE_V_BOOLEAN:
					ptVar->value.iValue = ptValObj->value.iValue;
					ptVar->length		= 1;
					ptVar->type			= TYPE_V_BOOLEAN;
					break;
				case TYPE_V_INTEGER:
					ptVar->value.iValue = ptValObj->value.iValue;
					ptVar->length		= 1;
					ptVar->type			= TYPE_V_INTEGER;
					break;
				case TYPE_V_STRING:
					ptVar->value.pcString = mstrcpy( ptValObj->value.pcString );
					ptVar->length		  = ptValObj->length;
					ptVar->type			  = TYPE_V_STRING;
					break;
				default:
					// Error
					break;
			}
		}
		else // Not a data type, try C-style string.
		{
			if( pvValue )
			{
				ptValObj = newVar( NULL, pvValue );
				varSet( ptVar, ptValObj );
				destroy( ptValObj );
			}
		}
		return ptVar;
	}
	return NULL;
}

/**
*	varSetProperty
*
*		Assign a new value to dynamic array or object property. If the property,
*		identified by pcProperty does not exist it is added as a new property.
*		If parameter ptVar is a dynamic variable other than an array or object
*		function varSetProperty() acts like varSet().
*
*	@param	pcProperty		Address C-string containing the property name
*	@param	pvValue			Address new property value.
*	@param	ptVar			Address dynamic variable.
*
*	@return		On success, the address of reassigned member otherwise NULL.
**/
DATA *varSetProperty( const char *pcProperty, void *pvValue, DATA *ptVar )
{
	DATA	*ptMember = NULL;
	
	if( isData( ptVar ) && (pcProperty && *pcProperty))
	{
		switch( ptVar->type )
		{
			case TYPE_V_ARRAY:
			case TYPE_V_OBJECT:
				if( !(ptMember = _varGetMember( pcProperty, ptVar )) )
				{
					return varNewProperty( pcProperty, pvValue, ptVar );
				}				
				break;
			default:
				ptMember = ptVar;
				break;
		}
		if( ptMember )
		{
			varSet( ptMember, pvValue );
		}
	}
	return ptMember;
}

/**
*	varSlice
*
*		Returns a new array whose content is copied from ptArray starting at index
*		iStart. parameter iLength specifies the number of members to be returned.
*		If iLength equals 0 all members in the array, starting at index iStart are
*		returned.  If iLength is greater than the number of members available, all
*		available members are returned. If iLength is a negative value, the total
*		number of members minus iLength is returned.
*
*	@note	The caller is responsible to free the returned result.
*
*	@param	ptArray			Address dynamic variable of type array.
*	@param	iStart			Starting index
*	@param	iLength			Number of members to be returned.
*
*	@return		Address new dynamic variable of type array.
**/
DATA *varSlice( DATA *ptArray, int iStart, int iLength )
{
	DATA	*ptSlice = newArray( NULL ),
			*ptMember;
	int		iCnt,
			iMax;
	
	if( isArray( ptArray ) && iStart >= 0 )
	{
		iCnt = varCount(ptArray) - iStart;
		iMax = (iLength > 0 ? iLength : (iLength < 0 ? (iCnt + iLength) : INT_MAX));
		for( ptMember = ptArray->value.ptMember; ptMember && iStart; ptMember = ptMember->ptNext, iStart-- );
		for( ; ptMember && iMax; ptMember = ptMember->ptNext, iMax-- )
		{
			varPush( ptSlice, newVar( NULL, ptMember ));
		}
	}
	return ptSlice;
}

/**
*	varSplit
*
*		Split the value of a dynamic variable of type string into an array of dynamic
*		varaibles of type string using content of pcSep as a set of separators.
*		Parameter bEmptyArgm controls if empty string arguments are allowed. An empty
*		argument is identified by two adjacent separators.
*
*	@note	The caller is responsible to free the returned result.
*
*	@param	ptString		Address of a dynamic variable of type string.
*	@param	pcSep			Address C-string containing a list of separator characters.
*	@param	bEmptyArgm		Indicate if empty string arguments are allowed.
*
*	@return		On success, the address of a new dynamic array otherwise NULL.
**/
DATA *varSplit( DATA *ptString, const char *pcSep, bool bEmptyArgm )
{
	DATA	*ptArray = newArray(NULL);
	char	cSegment[MAX_BUF_SIZE],
			cBuffer[MAX_BUF_SIZE],
			*pcSrc;
	int		iLen;
	
	if( isData(ptString) )
	{
		strncpyz( cBuffer, varGet( ptString ), sizeof(cBuffer)-1 );
		if( pcSep && *pcSep )
		{
			pcSrc = strfchr( cBuffer );
			while( pcSrc && *pcSrc )
			{
				if( (iLen = strcspn( pcSrc, pcSep )) )
				{
					strncpyz( cSegment, pcSrc, iLen );
					varPush( ptArray, newString( NULL, cSegment ) );
					pcSrc += pcSrc[iLen] ? iLen+1 : iLen;
				}
				else // Must be an empty parameter (e.g. two adjacent separators)
				{
					if( bEmptyArgm )
					{
						varPush( ptArray, newString( NULL, NULL ) );
					}
					pcSrc++;
				}
			}
		}
		else
		{
			varPush( ptArray, newString( NULL, cBuffer ) );
		}
		return ptArray;
	}
	return NULL;
}
