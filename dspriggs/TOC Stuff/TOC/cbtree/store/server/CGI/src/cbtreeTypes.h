#ifndef _CBTREE_TYPES_H_
#define _CBTREE_TYPES_H_

#include "cbtreeCommon.h"

#define MAGIC_V_VALUE	0XFEDCBA98

#define isArray(x)		isType((x), TYPE_V_ARRAY)
#define isBool(x)		isType((x), TYPE_V_BOOLEAN)
#define isInt(x)		isType((x), TYPE_V_INTEGER)
#define isInteger(x)	isType((x), TYPE_V_INTEGER)
#define isNull(x)		isType((x), TYPE_V_NULL)
#define isObject(x)		isType((x), TYPE_V_OBJECT)
#define isString(x)		isType((x), TYPE_V_STRING)

// Default data type structure to build PHP style associative arrays
typedef struct data {
	struct data	*ptNext;			// Pointer to next entry in the list.
	char		*name;				// Property name.
	int			type;				// Property type.
	int			length;				// Length (in case of arrays/objects the number of members).
	union {
		struct data	*ptMember;		// Pointer to the first member in an array or object.
		char		*pcString;		// Pointer to a C-string (type = TYPE_V_STRING)
		int			iValue;			// Integer value (type = (TYPE_V_BOOLEAN | TYPE_V_INTEGER)
	} value;
	int		_magic;					// Magic number of a valid data type. (MAGIC_V_VALUE)
} DATA;

// Enumerate common data types.
enum {
	TYPE_V_NONE = 0,
	TYPE_V_ARRAY,
	TYPE_V_BOOLEAN,
	TYPE_V_INTEGER,
	TYPE_V_OBJECT,
	TYPE_V_STRING,
	TYPE_V_NULL
} dataTypes;

#ifdef __cplusplus
	extern "C" {
#endif

void destroy( void *pvData );

bool isData( void *pvData );
bool isType( void *pvData, int iType );

bool hasProperty( const char *pcProperty, DATA *ptObject );

DATA *newVar( const char *pcName, void *pvValue );
DATA *newArray( const char *pcName );
DATA *newBoolean( const char *pcName, bool bValue );
DATA *newInteger( const char *pcName, int iValue );
DATA *newNull( const char *pcName );
DATA *newObject( const char *pcName );
DATA *newString( const char *pcName, char *pcValue );

int varCount( void *pvData );
void *varGet( DATA *ptVar );
DATA *varGetByIndex( int iIndex, DATA *ptObject  );
void *varGetProperty( const char *pcProperty, DATA *ptVar );
DATA *varGetProperties( DATA *ptObject );
int varGetType( DATA *ptVar );
bool varInArray( char *pcValue, DATA *ptObject );

DATA *varNewProperty( const char *pcProperty, void *pvValue, DATA *ptVar );
int varPush( DATA *ptObject, DATA *ptMember );

DATA *varSearch( char *pcValue, DATA *ptObject );
DATA *varSet( DATA *ptVar, void *pvValue );
DATA *varSetProperty( const char *pcProperty, void *pvValue, DATA *ptVar );
DATA *varSlice( DATA *ptArray, int iStart, int iLength );
DATA *varSplit( DATA *ptString, const char *pcSep, bool bEmptyArgm );

#ifdef __cplusplus
	}
#endif

#endif	/* _CBTREE_TYPES_H_ */
