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
*		This modules provides the required functionality to create and maintain
*		double linked list.
*
****************************************************************************************/
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
#endif	/* _MSC_VER */

#include <stdlib.h>

#include "cbtreeList.h"

/**
*	countList
*
*		Returns the total number of list entries.
*
*	@param	pList			Address of struct of type LIST (the list header).
*
*	@return		The total number of list entries.
**/
int countList( LIST *pList )
{
	LIST	*pEntry;
	int		i = 0;

	for( pEntry = pList->pNext; pEntry != pList; pEntry = pEntry->pNext, i++ );
	return i;
}

/**
*	destroyList
*
*		Release all resource associated with a list. If parameter func is specified
*		the associated function is called once for each list entry.
*
*	@param	ppList			Address of a pointer of type LIST
*	@param	func			Address user defined callback function.
**/
void destroyList( LIST **ppList, DESTROY_DATA func )
{
	ENTRY	*pEntry, *pNext;

	if( ppList && *ppList )
	{
		pEntry = (*ppList)->pNext;
		while( pEntry != *ppList )
		{
			if( func && pEntry->pvData )
			{
				func( pEntry->pvData );
			}
			pNext = pEntry->pNext;
			free( pEntry );
			pEntry = pNext;
		}
		free(*ppList);
		*ppList = NULL;
	}
}

/**
*	newList
*
*		Returns the address of a newly allocated LIST struct (the list header).
*		The list is a double linked list structure.
*
*	@return		Address newly allocated LIST struct.
**/
LIST *newList()
{
	LIST	*pList;
	
	if( (pList = (LIST *)malloc(sizeof(LIST))) )
	{
		pList->pNext  = pList;
		pList->pPrev  = pList;
		pList->pvData = NULL;
		return pList;
	}
	return NULL;
}

/**
*	insertHead
*
*		Insert a new entry at the head of the list. Paramater pMember represents the
*		address of any amount of arbitrary data, only the reference (data address) is
*		stored.
*
*	@param	pMember			Address arbitrary data.
*	@param	pList			Address of struct of type LIST (the list header).
*
*	@return		Address newly allocated list ENTRY struct.
**/
ENTRY *insertHead( void *pMember, LIST *pList )
{
	ENTRY	*pEntry;

	if( (pEntry = (ENTRY *)malloc(sizeof(ENTRY))) )
	{
		pList->pNext->pPrev	= pEntry;
		pEntry->pNext		= pList->pNext;
		pList->pNext		= pEntry;
		pEntry->pPrev		= pList;
		pEntry->pvData		= pMember;

		return pEntry;
	}
	return NULL;
}

/**
*	insertTail
*
*		Insert a new entry at the tail of the list. Paramater pMember represents the
*		address of any amount of arbitrary data, only the reference (data address) is
*		stored.
*
*	@param	pMember			Address arbitrary data.
*	@param	pList			Address of struct of type LIST (the list header).
*
*	@return		Address newly allocated list ENTRY struct.
**/
ENTRY *insertTail( void *pMember, LIST *pList )
{
	ENTRY	*pEntry;
	
	if( (pEntry = (ENTRY *)malloc(sizeof(ENTRY))) )
	{
		pEntry->pPrev		= pList->pPrev;
		pEntry->pNext		= pList;
		pList->pPrev->pNext	= pEntry;
		pList->pPrev		= pEntry;
		pEntry->pvData		= pMember;
		
		return pEntry;
	}
	return NULL;
}

/**
*	insertList
*
*		Insert a new entry either before or after an existing list entry. Paramater
*		pMember represents the address of the data to be inserted whereas iLocation
*		identifies the position relative to the existing entry pEntry.
*		If iLocation is less than zero the new entry is insert BEFORE the existing
*		entry otherwise it is inserted AFTER the existing entry.
*
*	@note	Do NOT test for the specific values like -1, 0 and 1 as different C
*			implementations and Operating Systems may return different values
*			when comparing strings.
*
*	@param	pMember			Address arbitrary data.
*	@param	pEntry			Address existing list entry.
*	@param	iLocation		Integer identifying the location were the new entry
*							is to be inserted relative to pEntry.
*
*	@return		Address newly allocated list ENTRY struct.
**/
ENTRY *insertList( void *pMember, ENTRY *pEntry, int iLocation )
{
	if( iLocation < 0 )
		return insertTail( pMember, (LIST *)pEntry );
	else
		return insertHead( pMember, (LIST *)pEntry );
}

/**
*	mergeList
*
*		Merge two lists. The list identified by parameter pSource is merged
*		with list pDest by appending all entries in pSource at the tail of
*		pDest.
*
*	@param	pDest			Address destination list
*	@param	pSource			Address source list.
*
*	@return		Address merged list (pDest).
**/
LIST *mergeList( LIST *pDest, LIST *pSource )
{
	if( pDest && !pDest->pvData )
	{
		if( pSource && !pSource->pvData && !listIsEmpty(pSource) )
		{
			pDest->pPrev->pNext	  = pSource->pNext;
			pSource->pNext->pPrev = pDest->pPrev;

			pDest->pPrev		= pSource->pPrev;
			pDest->pPrev->pNext = pDest;

			pSource->pNext = pSource;
			pSource->pPrev = pSource;
		}
	}
	return pDest;
}

/**
*	listIsEmpty
*
*		Returns true if the list identified by parameter pList is empty, that is,
*		it does not contain any entries.
*
*	@param	pList			Address of struct of type LIST (the list header).
**/
bool listIsEmpty( LIST *pList )
{
	if( pList )	return (pList == pList->pNext );
	return true;
}