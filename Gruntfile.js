module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    tag: {
      banner: '/*  <%= pkg.name %>\n' +
        ' *  @version <%= pkg.version %>\n' +
        ' *  @author <%= pkg.author %>\n' +
        ' *  Project: <%= pkg.homepage %>\n' +
        ' *  Copyright <%= pkg.year %>. <%= pkg.license %> licensed.\n' +
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
    autoprefixer: {
      build: {
        expand: true,
        cwd: 'dist',
        src: ['**/*.css', '!**/dbootstrap/**'],
        dest: 'dist'
      }
    },
    cssmin: {
      build: {
        expand: true,
        cwd: 'dist',
        src: ['**/*.css', '!**/dbootstrap/**'],
        dest: 'dist'
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
          cwd: 'viewer',
          src: ['**/*.js'],
          dest: 'dist',
          ext: '.js'
        }],
        options: {
          banner: '<%= tag.banner %>',
          sourceMap: true,
          sourceMapName: function(filePath) {
            return filePath + '.map';
          }
        }
      }
    },
    watch: {
      dev: {
        files: ['viewer/**'],
        tasks: ['newer:jshint']
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
          base: 'dist',
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
          archive: 'viewer.zip'
        },
        files: [{
          expand: true,
          cwd: 'dist',
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
  grunt.registerTask('default', 'Watches the project for changes, automatically builds them and runs a server.', ['connect:dev', 'open:dev_browser', 'watch']);
  grunt.registerTask('build', 'Compiles all of the assets and copies the files to the build directory.', ['clean', 'copy', 'stylesheets', 'scripts', 'compress:build']);
  grunt.registerTask('build-view', 'Compiles all of the assets and copies the files to the build directory.', ['clean', 'copy', 'stylesheets', 'scripts', 'connect:build', 'open:build_browser']);
  grunt.registerTask('scripts', 'Compiles the JavaScript files.', ['newer:jshint', 'newer:uglify']);
  grunt.registerTask('stylesheets', 'Compiles the stylesheets.', ['newer:autoprefixer', 'newer:cssmin']);
};