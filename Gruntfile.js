module.exports = function(grunt) {
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
        dest: 'dist/viewer',
        expand: true
      }
    },
    clean: {
      build: {
        src: ['dist']
      }
    },
    autoprefixer: {
      build: {
        expand: true,
        cwd: 'dist/viewer',
        src: ['**/*.css', '!**/dbootstrap/**'],
        dest: 'dist/viewer'
      }
    },
    cssmin: {
      build: {
        expand: true,
        cwd: 'dist/viewer',
        src: ['**/*.css', '!**/dbootstrap/**'],
        dest: 'dist/viewer'
      }
    },
    jshint: {
      build: {
        src: ['viewer/**/*.js', '!**/dbootstrap/**', '!**/TOC.js'],
        options: {
          jshintrc: '.jshintrc',
          reporter: require('jshint-stylish')
        }
      }
    },
    uglify: {
      build: {
        files: [{
          expand: true,
          cwd: 'dist/viewer',
          src: ['**/*.js'],
          dest: 'dist/viewer',
          ext: '.js'
        }],
        options: {
          banner: '<%= tag.banner %>',
          sourceMap: true,
          sourceMapIncludeSources: true,
          compress: {
            drop_console: true
          }
        }
      }
    },
    watch: {
      dev: {
        files: ['viewer/**'],
        tasks: ['jshint']
      },
      build: {
        files: ['dist/viewer/**'],
        tasks: ['jshint']
      }
    },
    connect: {
      dev: {
        options: {
          port: 3000,
          base: 'viewer',
          hostname: '*'
        }
      },
      build: {
        options: {
          port: 3001,
          base: 'dist/viewer',
          hostname: '*'
        }
      }
    },
    open: {
      dev_browser: {
        path: 'http://localhost:3000/index.html'
      },
      build_browser: {
        path: 'http://localhost:3001/index.html'
      }
    },
    compress: {
      build: {
        options: {
          archive: 'dist/viewer.zip'
        },
        files: [{
          expand: true,
          cwd: 'dist/viewer',
          src: ['**']
        }]
      }
    }
  });

  // load the tasks
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-contrib-compress');

  // define the tasks
  grunt.registerTask('default', 'Watches the project for changes, automatically builds them and runs a web server and opens default browser to preview.', ['connect:dev', 'open:dev_browser', 'watch:dev']);
  grunt.registerTask('build', 'Compiles all of the assets and copies the files to the build directory.', ['clean', 'copy', 'scripts', 'stylesheets', 'compress:build']);
  grunt.registerTask('build-view', 'Compiles all of the assets and copies the files to the build directory starts a web server and opens browser to preview app.', ['clean', 'copy', 'scripts', 'stylesheets', 'compress:build', 'connect:build', 'open:build_browser', 'watch:build']);
  grunt.registerTask('scripts', 'Compiles the JavaScript files.', ['jshint', 'uglify']);
  grunt.registerTask('stylesheets', 'Auto prefixes css and compiles the stylesheets.', ['autoprefixer', 'cssmin']);
};