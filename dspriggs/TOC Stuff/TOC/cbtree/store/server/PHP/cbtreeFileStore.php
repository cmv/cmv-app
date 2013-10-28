<?php
	/****************************************************************************************
	*	Copyright (c) 2012-2013, Peter Jekel
	*	All rights reserved.
	*
	*		The cbtree FileStore Server Side Application (cbtreeFileStore.php) is released under
	*		to following license:
	*
	*			BSD 2-Clause		(http://thejekels.com/cbtree/LICENSE)
	*
	*	@author		Peter Jekel
	*
	*	@date			12/01/2012
	*
	*	@version	1.2
	*
	*	History:
	*
	*		1.2			12/01/12	Path and BasePath parameters can now be a quoted string.
	*		1.1			08/01/12	Removed handling of queries and sorting, improved performance,
	*											reduced the overall JSON response sizes.
	*		1.0			07/01/12	Initial release
	*
	*****************************************************************************************
	*
	*		Description:
	*
	*			This file contains the server side application required	to enable the dojo
	*			cbtree FileStore and is part of the github project 'cbtree'. Your server MUST
	*			provide support for PHP applications in order for it to work properly.
	*			Alternatively, an ANSI-C CGI application is also available. See the notes on
	*			performance below.
	*
	*			The cbtree FileStore.php application is invoked by means of a HTTP GET, DELETE
	*			or POST request, the basic ABNF format of a request looks like:
	*
	*				HTTP-request	::= uri ('?' query-string)?
	*				query-string	::= (qs-param ('&' qs-param)*)?
	*				qs-param			::= authToken | basePath | path | query | queryOptions | options
	*				authToken			::= 'authToken' '=' json-object
	*				basePath			::= 'basePath' '=' path-rfc3986
	*				path					::= 'path' '=' path-rfc3986
	*				query-options ::= 'queryOptions' '=' json-object
	*				options				::= 'options' '=' json-array
	*
	*			Please refer to http://json.org for the correct JSON encoding of the
	*			parameters.
	*
	*		NOTE:		Configuration of your server for either PHP or CGI support is beyond
	*						the scope of this document.
	*
	****************************************************************************************
	*
	*		QUERY-STRING Parameters:
	*
	*			authToken:
	*
	*				The authToken parameter is a JSON object. There are no restrictions with
	*				regards to the content of the object. (currently not used).
	*
	*			basePath:
	*
	*				The basePath parameter is a URI reference (rfc 3986) relative to the server's
	*				document root used to compose the root directory as follows:
	*
	*					root-dir ::= document_root '/' basePath?
	*
	*			path:
	*
	*				The path parameter is used to specify a specific location relative to the
	*				above mentioned root_dir. Therfore, the full search path is:
	*
	*					full-path = root_dir '/' path?
	*
	*			queryOptions:
	*
	*				The queryOptions parameter specifies a set of JSON 'property:value' pairs
	*				used during the file search. Currently two properties are supported: "deep"
	*				and "ignoreCase". Property deep indicates if a recursive search is required
	*				whereas ignoreCase indicates if values are to be compared case insensitive/
	*
	*				Example:	queryOptions={"deep":true, "ignorecase":true}
	*
	*			options:
	*
	*				The options parameter is a JSON array of strings. Each string specifying a
	*				search options to be enabled. Currently the following option is supported:
	*				"showHiddenFiles".
	*
	*				Example:	options=["showHiddenFiles"]
	*
	****************************************************************************************
	*
	*		ENVIRONMENT VARIABLE:
	*
	*			CBTREE_BASEPATH
	*
	*				The basePath is a URI reference (rfc 3986) relative to the server's
	*				document root used to compose the root directory.	If this variable
	*				is set it overwrites the basePath parameter in any query string and
	*				therefore becomes the server wide basepath.
	*
	*					CBTREE_BASEPATH /myServer/wide/path
	*
	*			CBTREE_METHODS
	*
	*				A comma separated list of HTTP methods to be supported by the Server
	*				Side Application. By default only HTTP GET is supported. Example:
	*
	*					CBTREE_METHODS GET,DELETE
	*
	*		Notes:
	*
	*			-	Some HTTP servers require	special configuration to make environment
	*				variables available to	script or CGI application.	For example, the
	*				Apache HTTP servers requires you to either use the SetEnv or PassEnv
	*				directive. To make the environment variable CBTREE_METHODS available
	*				add the following to your httpd.conf file:
	*
	*					SetEnv CBTREE_METHODS GET,DELETE
	*											or
	*					PassEnv CBTREE_METHODS
	*
	*				(See http://httpd.apache.org/docs/2.2/mod/mod_env.html for details).
	*
	****************************************************************************************
	*
	*		PERFORMACE:
	*
	*				If you plan on using this cbtreeFileStore	on large file systems with, for
	*				example, a	checkbox tree that requires a strict parent-child relationship
	*				it is highly recommended to use the ANSI-C CGI implementation instead, that
	*				is, assuming your server is configured to provide CGI support.
	*				PHP is an interpreter and relatively slow compared to native compiled CGI
	*				applications. A Microsoft Windows version of the ANSI-C CGI application is
	*				available.
	*
	*				To configure an Apache HTTP server for CGI support please refer to:
	*
	*						http://httpd.apache.org/docs/2.2/howto/cgi.html
	*
	*		NOTE:	When using the ANSI-C CGI implementation no PHP support is required.
	*
	****************************************************************************************
	*
	*		SECURITY:
	*
	*				Some	basic security issues are addressed	by this implementation.	For example,
	*				only HTTP methods allowed are served. Malformed QUERY-STRING parameters are NOT
	*				skipped and	ignored, instead they will result	in a 'Bad Request' response	to
	*				the server/client. Requests to access files above the server's document root are
	*				rejected returning the HTTP forbidden response (403).
	*
	*		AUTHENTICATION:
	*
	*				This application does NOT authenticate the calling party however, it does test
	*				for, and retreives, a 'authToken' paramter if present.
	*
	*		NOTE:	This implementation will not list any files starting with a dot like .htaccess
	*					unless explicitly requested. However it will NOT process .htaccess files.
	*					Therefore, it is the user's responsibility not to include any private or other
	*					hidden files in the directory tree accessible to this application.
	*
	***************************************************************************************
	*
	*		RESPONSES:
	*
	*				Assuming a valid HTTP GET or DELETE request was received the response to
	*				the client complies with the following ABNF notation:
	*
	*					response			::= '{' (totals ',')? (status ',')? file-list '}'
	*					totals				 ::= '"total"' ':' number
	*					status				::= '"status"' ':' status-code
	*					status-code		::=	'200' | '204' | '401'
	*					file-list			::= '"items"' ':' '[' file-info* ']'
	*					file-info			::= '{' name ',' path ',' size ',' modified (',' directory)?
	*														(',' oldPath)? (',' children ',' expanded)? '}'
	*					path					::= '"path"' ':' json-string
	*					name					::= '"name"' ':' json-string
	*					size					::= '"size"' ':' number
	*					modified			::= '"modified"' ':' number
	*					directory			::= '"directory"' ':' ('true' | 'false')
	*					oldPath				::= '"oldPath"' ':' json-string
	*					children			::= '[' file-info* ']'
	*					expanded			::= '"_EX"' ':' ('true' | 'false')
	*					quoted-string ::= '"' CHAR* '"'
	*					number				::= DIGIT+
	*					DIGIT					::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
	*
	*		Notes:
	*
	*				-	The expanded property indicates if a deep search was performed on a
	*					directory. Therefore, if expanded is true and children is empty we
	*					are dealing with an empty directory and not a directory that hasn't
	*					been searched/expanded yet. The expanded property is typically used
	*					when lazy loading the file store.
	*
	***************************************************************************************/

	// Define the possible HTTP result codes returned by this application.
	define( "HTTP_V_OK",								 200);
	define( "HTTP_V_NO_CONTENT",					204);
	define( "HTTP_V_BAD_REQUEST",				400);
	define( "HTTP_V_UNAUTHORIZED",				401);
	define( "HTTP_V_FORBIDDEN",					403);
	define( "HTTP_V_NOT_FOUND",					404);
	define( "HTTP_V_METHOD_NOT_ALLOWED",	405);
	define( "HTTP_V_CONFLICT",						409);
	define( "HTTP_V_GONE",								410);
	define( "HTTP_V_SERVER_ERROR",				500);

	$docRoot = $_SERVER["DOCUMENT_ROOT"];

	$relPath = "";
	$method	= null;
	$files	 = null;
	$total	 = 0;
	$status	 = 0;

	$method = $_SERVER["REQUEST_METHOD"];

	// Check the HTTP method first.
	if (!cgiMethodAllowed($method)) {
		cgiResponse( HTTP_V_METHOD_NOT_ALLOWED, "Method Not Allowed", NULL);
		header("Allow: " . getenv("CBTREE_METHODS"));
		error_log( "Invalid or unsupported method: [".$method."]");
		return;
	}

	// Validate the HTTP QUERY-STRING parameters
	$args	= getArguments($method, $status);
	if ($args == null ) {
		cgiResponse( HTTP_V_BAD_REQUEST, "Bad Request", "Malformed query arguments." );
		return;
	}

	if ($args->authToken) {
		// Your authentication may go here....
	}

	$rootDir	= str_replace( "\\","/", realPath( $docRoot . "/" . $args->basePath ));
	$fullPath = str_replace( "\\","/", realPath( $rootDir . "/" . $args->path ));

	if ($rootDir && $fullPath) {
		// Make sure the caller isn't backtracking by specifying paths like '../../../'
		if ( strncmp($rootDir, $docRoot, strlen($docRoot)) || strncmp($fullPath, $rootDir, strlen($rootDir)) ) {
			cgiResponse( HTTP_V_FORBIDDEN, "Forbidden", "We're not going there..." );
			return;
		}

		switch($method) {
			case "DELETE":
				$files = deleteFile( $fullPath, $rootDir, $args, $status );
				if ($files) {
					// Compile the final result
					$result							= new stdClass();
					$result->total			= count($files);
					$result->status			= $status;
					$result->items			= $files;

					header("Content-Type: text/json");
					print( json_encode($result) );
				} else {
					cgiResponse( $status, "Not Found", null );
				}
				break;

			case "GET":
				$files = getFile( $fullPath, $rootDir, $args, $status );
				if ($files) {
					$total = count($files);
					// Compile the final result
					$result							= new stdClass();
					$result->total			= $total;
					$result->status			= $total ? HTTP_V_OK : HTTP_V_NO_CONTENT;
					$result->items			= $files;

					header("Content-Type: text/json");
					print( json_encode($result) );
				} else {
					cgiResponse( $status, "Not Found", null );
				}
				break;

			case "POST":
				$files = renameFile( $fullPath, $rootDir, $args, $status );
				// Compile the final result
				if ($status == HTTP_V_OK) {
					$result							= new stdClass();
					$result->total			= count($files);
					$result->status			= $status;
					$result->items			= $files;

					header("Content-Type: text/json");
					print( json_encode($result) );
				} else {
					cgiResponse( $status, "system error.", "Failed to rename file." );
				}
				break;
		}
	}	else {
		cgiResponse( HTTP_V_NOT_FOUND, "Not Found", "Invalid path and/or basePath." );
	}

	/**
	*		cgiMethodAllowed
	*
	*			Returns true if the HTTP method is allowed, that is, supported by this
	*			application. (See the description 'ENVIRONMENT VARIABLE' above).
	*
	*		@param	method				Method name string.
	*
	*		@return		true or false
	**/
	function cgiMethodAllowed( /*string*/ $method ) {
		$allowed = "GET," . getenv("CBTREE_METHODS");
		$methods = explode(",", $allowed);
		$count	 = count($methods);

		for ($i = 0;$i<$count; $i++) {
			if ($method == trim($methods[$i])) {
				return true;
			}
		}
		return false;
	}

	/**
	*		cgiResponse
	*
	*			Sends a CGI response back to the caller.
	*
	*	@param	status					HTTP result code
	*	@param	statText				HTTP reason phrase.
	*	@param	infoText				Optional text returned to the caller.
	**/
	function cgiResponse( $status, $statText, $infoText = null) {
		header("Content-Type: text/html");
		header("Status: " . $status . $statText );
		if( $infoText ) {
			print( $infoText );
		}
	}

	/**
	*		_deleteDirectory
	*
	*			Delete a directory including its content. All successfully deleted files
	*			are returned as an array of strings.
	*
	*	@param	dirPath					Directory path string
	*	@param	rootDir					Root directory
	*	@param	args						HTTP QUERY-STRING arguments decoded.
	*	@param	status					Receives the final result (200, 204 or 404).
	*
	*	@return		An array of FILE_INFO objects or NULL in case no match was found.
	**/
	function _deleteDirectory( /*string*/$dirPath, /*string*/$rootDir, /*object*/$args, /*number*/&$status ) {
		// Set permission on the directory first.
		chmod($dirPath, 0777);

		if( ($dirHandle = opendir($dirPath)) ) {
			$files	 = array();

			while($file = readdir($dirHandle)) {
				if ($file != "." && $file != "..") {
					$fileInfo = fileToStruct( $dirPath, $rootDir, $file, $args );
					$filePath = $dirPath . "/" . $file;
					if (is_dir($filePath)) {
						$children = _deleteDirectory( $filePath, $rootDir, $args, $stat );
						$files		= array_merge( $files, $children );
						$result	 = rmdir( $filePath );
					} else {
						chmod($path, 0666);
						$result = unlink($filePath);
					}
					if ($result) {
						$files[] = $fileInfo;
					} else {
						$status = HTTP_V_UNAUTHORIZED;
					}
				}
			}
			closedir($dirHandle);
			return $files;
		}
		$status = HTTP_V_NOT_FOUND;
		return null;
	}

	/**
	*		deleteFile
	*
	*				Delete a file.
	*
	*	@param	filePath				File path string
	*	@param	rootDir					Root directory
	*	@param	args						HTTP QUERY-STRING arguments decoded.
	*	@param	status					Receives the final result (200, 204 or 404).
	*
	*	@return		An array of FILE_INFO objects or NULL in case no match was found.
	**/
	function deleteFile( /*string*/$filePath, /*string*/$rootDir, /*object*/$args, /*number*/&$status ) {
		if( file_exists( $filePath ) ) {
			$status	 = HTTP_V_OK;
			$files		 = array();
			$uri			 = parsePath( $filePath, $rootDir );
			$fileInfo = fileToStruct( $uri->dirPath, $rootDir, $uri->filename, $args );

			if (is_dir($filePath)) {
				$files	= _deleteDirectory( $filePath, $rootDir, $args, $stat );
				$result = rmdir( $filePath );
			} else {
				chmod($filePath, 0666);
				$result = unlink($filePath);
			}
			if ($result) {
				$files[] = $fileInfo;
			} else {
				$status = HTTP_V_UNAUTHORIZED;
			}
			return $files;
		}
		$status = HTTP_V_NOT_FOUND;
		return null;
	}

	/**
	*		fileFilter
	*
	*			Returns true if a file is to be exlcuded (filtered) based on the HTTP query
	*			string parameters such as 'showHiddenFiles', otherwise false.
	*			The current and parent directory entries are excluded by default.
	*
	*	@param	fileInfo
	*	@param	args
	*
	*	@return	true or false
	**/
	function fileFilter( /*object*/$fileInfo, /*object*/$args ) {
		if ( (!$args->showHiddenFiles && $fileInfo->name[0] == ".") ||
				 ($fileInfo->name == ".." || $fileInfo->name == ".") ) {
					return true;
		}
		return false;
	}

	/**
	*		fileToStruct
	*
	*			Create a FILE_INFO object
	*
	*	@param	dirPath					Directory path string
	*	@param	rootDir					Root directory
	*	@param	filename				Filename
	*
	*	@return		FILE_INFO object.
	**/
	function fileToStruct( /*string*/$dirPath, /*string*/$rootDir, /*string*/$filename, /*object*/$args ) {
		$fullPath = $dirPath . "/" . $filename;
		$atts		 = stat( $fullPath );

		$relPath	= "./" . substr( $fullPath, (strlen($rootDir)+1) );
		$relPath	= trim( str_replace( "\\", "/", $relPath ), "/");

		$fileInfo							= new stdClass();
		$fileInfo->name			 = $filename;
		$fileInfo->path				= $relPath;
		$fileInfo->modified	 = $atts[9];

		if (is_dir($fullPath)) {
			$fileInfo->directory = true;
			$fileInfo->children	= array();
			$fileInfo->_EX			 = false;
			$fileInfo->size			= 0;
		} else {
			$fileInfo->size			= filesize($fullPath);
		}
		return $fileInfo;
	}

	/**
	*		getArguments
	*
	*			Returns an ARGS object with all HTTP QUERY-STRING parameters extracted and
	*			decoded. See the description on top for the ABNF notation of the parameter.
	*
	*	@note		All QUERY-STRING parameters are optional, if however a parameter is
	*					specified it MUST comply with the formentioned ABNF format.
	*					For security, invalid formatted parameters are not skipped or ignored,
	*					instead they will result in a HTTP Bad Request status (400).
	*
	*	@param	status					Receives the final result code. (200 or 400)
	*
	*	@return		On success an 'args' object otherwise NULL
	**/
	function getArguments( $method, /*integer*/&$status ) {

		$status	= HTTP_V_BAD_REQUEST;		// Lets assume its a malformed query string
		$_ARGS	= null;

		$args										= new stdClass();
		$args->authToken				= null;
		$args->basePath					= "";
		$args->deep						 = false;
		$args->path						 = null;
		$args->showHiddenFiles	= false;

		switch ($method) {
			case "DELETE":
				$_ARGS = $_GET;
				if (!array_key_exists("path", $_ARGS)) {
					return null;
				}
				break;

			case "GET":
				$_ARGS = $_GET;

				$args->ignoreCase			 = false;
				$args->rootDir					= "";

				// Get the 'options' and 'queryOptions' first before processing any other parameters.
				if (array_key_exists("options", $_ARGS)) {
					$options = str_replace("\\\"", "\"", $_ARGS['options']);
					$options = json_decode($options);
					if (is_array($options)) {
						if (array_search("showHiddenFiles", $options) > -1) {
							$args->showHiddenFiles = true;
						}
					}
					else	// options is not an array.
					{
						return null;
					}
				}
				if (array_key_exists("queryOptions", $_ARGS)) {
					$queryOptions = str_replace("\"\"", "\"", $_ARGS['queryOptions']);
					$queryOptions = json_decode($queryOptions);
					if (is_object($queryOptions)) {
						if (property_exists($queryOptions, "deep")) {
							$args->deep = $queryOptions->deep;
						}
						if (property_exists($queryOptions, "ignoreCase")) {
							$args->ignoreCase = $queryOptions->ignoreCase;
						}
					}
					else	// queryOptions is not an object.
					{
						return null;
					}
				}
				break;

			case "POST":
				$_ARGS = $_POST;

				$args->newValue	= null;

				if( !array_key_exists("newValue", $_ARGS) ||
						!array_key_exists("path", $_ARGS)) {
					return null;
				}
				if (is_string($_ARGS['newValue'])) {
					$args->newValue = trim($_ARGS["newValue"],"\"");
				} else {
					return null;
				}
				break;
		} /* end switch($method) */

		// Get authentication token. There are no restrictions with regards to the content
		// of this object.
		if (array_key_exists("authToken", $_ARGS)) {
			$authToken = str_replace("\"\"", "\"", $_ARGS['authToken']);
			$authToken = json_decode($authToken);
			if ($authToken) {
				$args->authToken = $authToken;
			}
		}
		// Check for a basePath
		$args->basePath = getenv("CBTREE_BASEPATH");
		if (!$args->basePath) {
			if (array_key_exists("basePath", $_ARGS)) {
				$args->basePath = trim($_ARGS['basePath'],"\"");
			}
		}
		if ($args->basePath && !is_string($args->basePath)) {
			return null;
		}

		//	Check if a specific path is specified.
		if (array_key_exists("path", $_ARGS)) {
			if (is_string($_ARGS['path'])) {
				$args->path = realURL(trim($_ARGS['path'],"\""));
			} else {
				return null;
			}
		}
		$args->path = trim( ("./" . $args->path), "/" );

		$status = HTTP_V_OK;		// Return success
		return $args;
	}

	/**
	*		getDirectory
	*
	*			Returns the content of a directory as an array of FILE_INFO objects.
	*
	*	@param	dirPath					Directory path string
	*	@param	rootDir					Root directory
	*	@param	args						HTTP QUERY-STRING arguments decoded.
	*	@param	status					Receives the final result (200, 204 or 404).
	*
	*	@return		An array of FILE_INFO objects or NULL in case no match was found.
	**/
	function getDirectory( /*string*/$dirPath, /*string*/$rootDir, /*object*/$args, /*number*/&$status ) {
		if( ($dirHandle = opendir($dirPath)) ) {
			$files = array();
			$stat	 = 0;
			while($file = readdir($dirHandle)) {
				$fileInfo = fileToStruct( $dirPath, $rootDir, $file, $args );
				if (!fileFilter( $fileInfo, $args )) {
					if (property_exists($fileInfo, "directory") && $args->deep) {
						$subDirPath = $dirPath . "/" . $fileInfo->name;
						$fileInfo->children = getDirectory( $subDirPath, $rootDir, $args, $stat );
						$fileInfo->_EX			= true;
					}
					$files[] = $fileInfo;
				}
			}
			$status = $files ? HTTP_V_OK : HTTP_V_NO_CONTENT;
			closedir($dirHandle);
			return $files;
		}
		$status = HTTP_V_NOT_FOUND;
		return null;
	}

	/**
	*		getFile
	*
	*			Returns the information for the file specified by parameter fullPath.
	*			If the designated file is a directory the directory content is returned
	*			as the children of the file.
	*
	*	@param	filePath				File path string
	*	@param	rootDir					Root directory
	*	@param	args						HTTP QUERY-STRING arguments decoded.
	*	@param	status					Receives the final result (200, 204 or 404).
	*
	*	@return		An array of 1 FILE_INFO object or NULL in case no match was found.
	**/
	function getFile( /*string*/$filePath, /*string*/$rootDir, /*object*/$args, /*number*/&$status ) {
		if( file_exists( $filePath ) ) {
			$files		 = array();
			$uri			 = parsePath( $filePath, $rootDir );
			$fileInfo = fileToStruct( $uri->dirPath, $rootDir, $uri->filename, $args );

			if (!fileFilter( $fileInfo, $args )) {
				if (property_exists($fileInfo, "directory")) {
					$fileInfo->children = getDirectory( $filePath, $rootDir, $args, $status );
					$fileInfo->_EX			= true;
				}
				// Don't give out details about the root directory.
				if ($filePath === $rootDir) {
					$fileInfo->name = ".";
					$fileInfo->size = 0;
				}
				$files[] = $fileInfo;
			}
			$status = $files ? HTTP_V_OK : HTTP_V_NO_CONTENT;
			return $files;
		}
		$status = HTTP_V_NOT_FOUND;
		return null;
	}

	/**
	*		parsePath
	*
	*			Helper function to normalize and seperate a URI into its components. This
	*			is a simplified implementation as we only extract what may be needed.
	*
	*	@param	fullPath				Full path string
	*	@param	rootDir					Root directory
	*
	*	@return
	**/
	function parsePath ($fullPath, $rootDir) {
		$fullPath = str_replace( "\\", "/", $fullPath );
		$fullPath = realURL( $fullPath );

		$lsegm		= strrpos($fullPath,"/");
		$filename = substr( $fullPath, ($lsegm ? $lsegm + 1 : 0));
		$dirPath	= substr( $fullPath, 0, $lsegm);

		$relPath	= substr( $fullPath, (strlen($rootDir)+1));
		$relPath	= trim( ("./" . $relPath), "/" );

		$uri						 = new stdClass();
		$uri->relPath		= $relPath;
		$uri->dirPath		= $dirPath;
		$uri->filename	= $filename;

		return $uri;
	}

	/**
	*		realURL
	*
	*			Remove all dot (.) segment according to RFC-3986 $5.2.4
	*
	*	@param	path						Path string
	**/
	function realURL( $path ) {
		$url = "";
		do {
			$p = $path;
			if (!strncmp( $path, "../", 3) || !strncmp($path,"./", 2)) {
				$path = substr($path, strpos($path,"/")+1 );
				continue;
			}
			if (!strncmp( $path, "/./", 3)) {
				$path = "/". substr($path, 3);
				continue;
			}
			if (!strcmp( $path, "/.")) {
				$path = "/";
				continue;
			}
			if (!strncmp( $path, "/../", 4)) {
				$path = "/". substr($path, 4);
				$pos = strrpos($url,"/");
				$url = substr($url, 0, $pos);
				continue;
			}
			if (!strcmp( $path, "/..")) {
				$path = "/";
				$pos = strrpos($url,"/");
				$url = substr($url, 0, $pos);
				continue;
			}
			if (!strcmp( $path, "..") || !strcmp($path,".")) {
				break;
			}
			if($path[0] == '/' ) {
				if ($path[1] != '/') {
					$pos	= strcspn( $path, "/", 1 );
				} else {
					$pos = 1;
				}
			} else {
				$pos	= strcspn( $path, "/" );
			}
			$segm = substr( $path, 0, $pos );
			$path = substr( $path, $pos );
			$url	= $url . $segm;

		} while( $path != $p );
		return str_replace( "//", "/", $url );
	}

	/**
	*		renameFile
	*
	*			Rename a file
	*
	*	@param	fullPath				Full path string (file path)
	*	@param	rootDir					Root directory
	*	@param	args						HTTP QUERY-STRING arguments decoded.
	*	@param	status					Receives the final result (200, 204 or 404).
	*
	*	@return		An array of 1 FILE_INFO object or NULL in case no match was found.
	**/
	function renameFile( $fullPath, $rootDir, $args, &$status ) {
		$status = HTTP_V_OK;

		if( file_exists( $fullPath ) ) {
			$fileList = array();
			$newPath	= realURL($rootDir."/".realURL($args->newValue));
			if (!strncmp($newPath, $rootDir, strlen($rootDir))) {
				if (!file_exists( $newPath )) {
					if (rename( $fullPath, $newPath )) {
						$uri		 = parsePath( $newPath, $rootDir );
						$newFile = fileToStruct( $uri->dirPath, $rootDir, $uri->filename, $args );

						$newFile->oldPath = "./" . substr( $fullPath, (strlen($rootDir)+1));
						$fileList[] = $newFile;
					} else {
						$status = HTTP_V_NOT_FOUND;
					}
				} else {
					$status = HTTP_V_CONFLICT;
				}
			} else {
				$status = HTTP_V_FORBIDDEN;
			}
			return $fileList;
		}
		return null;
	}

?>
