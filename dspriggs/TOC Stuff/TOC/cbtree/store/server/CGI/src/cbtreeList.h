#ifndef _CBTREE_LIST_H_
#define _CBTREE_LIST_H_

#include "cbtreeCommon.h"

typedef struct list {
	struct list	*pNext;
	struct list *pPrev;
	void		*pvData;
	} LIST, ENTRY;

typedef void (*DESTROY_DATA)( void * );

#ifdef __cplusplus
	extern "C" {
#endif

int	   countList( LIST *pList );
void   destroyList( LIST **ppList, DESTROY_DATA func );
ENTRY *insertHead( void *pMember, LIST *pList );
ENTRY *insertList( void *pMember, ENTRY *pEntry, int iLocation );
ENTRY *insertTail( void *pMember, LIST *pList );
bool   listIsEmpty( LIST *pList );
LIST  *mergeList( LIST *pDest, LIST *pSource );
LIST  *newList();

#ifdef __cplusplus
	}
#endif

#endif /* _CBTREE_LIST_H_ */
