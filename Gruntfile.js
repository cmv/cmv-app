/* global module */
module.exports = function (grunt) {

    // middleware for browserSync
    var bodyParser = require('body-parser');
    var middleware = [
        function (req, res, next) {
            var proxypage = require('proxypage');
            var proxyRe = /\/proxy\/proxy.ashx/i;
            if (!proxyRe.test(req.url)) {
                return next();
            }
            proxypage.proxy(req, res);
        },
        bodyParser.json(),
        bodyParser.urlencoded({extended: true})
    ];

    // grunt task config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        tag: {
            banner: '/*  <%= pkg.name %>\n' +
                ' *  version <%= pkg.version %>\n' +
                ' *  Project: <%= pkg.homepage %>\n' +
                ' */\n'
        },
        copy: {
            build: {
                cwd: 'viewer',
                src: ['**'],
                dest: 'dist',
                expand: true
            }
        },
        clean: {
            build: {
                src: ['dist']
            }
        },
        postcss: {
            build: {
                expand: true,
                cwd: 'dist',
                src: ['**/*.css'],
                dest: 'dist'
            }
        },
        cssmin: {
            build: {
                expand: true,
                cwd: 'dist',
                src: ['**/*.css'],
                dest: 'dist'
            }
        },

        stylelint: {
            build: {
                src: ['viewer/**/*.css', '!viewer/css/theme/**/*.css']
            }
        },

        eslint: {
            build: {
                src: ['viewer/**/*.js'],
                options: {
                    eslintrc: '.eslintrc'
                }
            }
        },

        uglify: {
            build: {
                files: [{
                    expand: true,
                    cwd: 'dist',
                    src: ['**/*.js', '!**/config/**'],
                    dest: 'dist',
                    ext: '.js'
                }],
                options: {
                    banner: '<%= tag.banner %>',
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    compress: {
                        'drop_console': true
                    }
                }
            }
        },
        watch: {
            dev: {
                files: ['viewer/**'],
                tasks: ['eslint', 'stylelint']
            },
            build: {
                files: ['dist/**'],
                tasks: ['eshint', 'stylelint']
            }
        },
        browserSync: {
            dev: {
                bsFiles: {
                    src : ['viewer/**']
                },
                options: {
                    cors: true,
                    https: true,
                    middleware: middleware,
                    port: 3000,
                    server: 'viewer',
                    ui: {
                        port: 3002
                    },
                    watchTask: true
                }
            },
            build: {
                bsFiles: {
                    src : ['dist/**']
                },
                options: {
                    cors: true,
                    https: true,
                    port: 3001,
                    server: 'dist',
                    ui: {
                        port: 3003
                    },
                    watchTask: true
                }
            }
        },
        compress: {
            build: {
                options: {
                    archive: 'dist/cmv-app.zip'
                },
                files: [{
                    expand: true,
                    cwd: 'dist',
                    src: ['**', '!**/dijit.css']
                }]
            }
        }
    });

    // load the tasks
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-postcss');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-stylelint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-compress');

    // define the tasks
    grunt.registerTask('default', 'Watches the project for changes, automatically builds them and runs a web server and opens default browser to preview.', ['eslint', 'stylelint', 'browserSync:dev', 'watch:dev']);
    grunt.registerTask('build', 'Compiles all of the assets and copies the files to the build directory.', ['clean', 'copy', 'scripts', 'stylesheets', 'compress']);
    grunt.registerTask('build-view', 'Compiles all of the assets and copies the files to the build directory starts a web server and opens browser to preview app.', ['clean', 'copy', 'scripts', 'stylesheets', 'compress', 'browserSync:build', 'watch:build']);
    grunt.registerTask('scripts', 'Compiles the JavaScript files.', ['eslint', 'uglify']);
    grunt.registerTask('stylesheets', 'Auto prefixes css and compiles the stylesheets.', ['stylelint', 'postcss', 'cssmin']);
    grunt.registerTask('lint', 'Run eslint and stylelint.', ['eslint', 'stylelint']);
};