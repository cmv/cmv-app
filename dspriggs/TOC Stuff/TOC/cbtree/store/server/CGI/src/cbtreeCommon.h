#ifndef __CBTREE_COMMON_H__
#define __CBTREE_COMMON_H__

#ifdef WIN32
  #ifdef _MSC_VER
	// Disable some Microsoft Visual Studio warning messages
	#pragma warning( disable : 4706 )	// assignments in conditional statement
  #endif /* _MSC_VER */
  #define	snprintf			_snprintf
  #define	stricmp				_stricmp
  #define	chmod				_chmod
  #define	rmdir				_rmdir
#endif	/* WIN32 */

#ifndef __cplusplus
  #define bool	int
  #define false 0
  #define true  1
#endif

// HTTP response codes.
#define	HTTP_V_OK					200
#define HTTP_V_NO_CONTENT			204
#define HTTP_V_BAD_REQUEST			400
#define HTTP_V_UNAUTHORIZED			401
#define	HTTP_V_FORBIDDEN			403
#define	HTTP_V_NOT_FOUND			404
#define HTTP_V_METHOD_NOT_ALLOWED	405
#define HTTP_V_CONFLICT				409
#define HTTP_V_GONE					410
#define HTTP_V_SERVER_ERROR			500

#define	MAX_BUF_SIZE	4096		// Maximum buffer size
#define	MAX_RSP_SEGM	256000		// Default JSON response buffer segment.
#define MAX_PATH_SIZE	256			// Maximum path size in bytes

#endif /* __CBTREE_COMMON_H__ */
